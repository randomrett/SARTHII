import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.report import Report
from app.models.activity import Activity
from app.models.audit import AuditRecord
from app.schemas.ingest import IngestionResultSchema
from app.schemas.activity import ActivityOut
from app.utils.matching import match_report_to_schedule
from app.utils.document_parser import parse_document_file
from app.utils.excel_parser import parse_report_spreadsheet, parse_schedule_spreadsheet
from app.utils.gemini import (
    analyze_image_with_gemini,
    analyze_video_with_gemini,
    GeminiRateLimitError,
    GeminiConfigError
)

router = APIRouter(tags=["Ingestion, Schedule Import & AI Vision"])

# Setup uploads directory
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
IMAGES_DIR = UPLOADS_DIR / "images"
VIDEOS_DIR = UPLOADS_DIR / "videos"

IMAGES_DIR.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# Maximum File Sizes
MAX_EXCEL_SIZE = 10 * 1024 * 1024   # 10 MB
MAX_IMAGE_SIZE = 15 * 1024 * 1024   # 15 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024   # 50 MB

def _process_text_and_audit(
    raw_text: str,
    source_type: str,
    filename: Optional[str],
    project_id: Optional[str],
    file_path: Optional[str],
    media_url: Optional[str],
    token_usage: Optional[dict],
    db: Session,
    force_pending_review: bool = False,
    override_notes: Optional[str] = None
) -> IngestionResultSchema:
    # 1. Save Report Record
    report = Report(
        project_id=project_id,
        raw_text=raw_text,
        submitted_by=f"ingest_{source_type}",
        file_path=file_path,
        file_type=source_type,
        media_url=media_url
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 2. Query active activities
    if project_id:
        db_activities = db.query(Activity).filter(Activity.project_id == project_id).all()
    else:
        db_activities = db.query(Activity).all()

    if not db_activities:
        default_acts = [
            Activity(id="ACT-001", name="Diaphragm Wall & Piling", zone="Zone A", planned_start="2026-01-01", planned_end="2026-03-31", progress=100.0, status="completed"),
            Activity(id="ACT-002", name="Mass Excavation & Earthworks", zone="Zone A", planned_start="2026-02-01", planned_end="2026-04-30", progress=60.0, status="in_progress"),
            Activity(id="ACT-003", name="Raft Foundation Reinforcement & Pour", zone="Zone A", planned_start="2026-04-01", planned_end="2026-06-30", progress=20.0, status="in_progress"),
            Activity(id="ACT-004", name="Base Slab Casting", zone="Zone B", planned_start="2026-05-01", planned_end="2026-07-31", progress=0.0, status="not_started"),
            Activity(id="ACT-005", name="Pier & Column Casting", zone="Pier 4", planned_start="2026-06-01", planned_end="2026-08-31", progress=10.0, status="in_progress")
        ]
        for a in default_acts:
            db.add(a)
        db.commit()
        db_activities = db.query(Activity).all()

    activities_data = [
        {
            "id": a.id,
            "name": a.name,
            "zone": a.zone,
            "planned_start": a.planned_start,
            "planned_end": a.planned_end,
            "progress": float(a.progress or 0.0),
            "status": a.status,
            "category": a.category,
            "unit": a.unit,
            "target_quantity": a.target_quantity,
            "completed_quantity": a.completed_quantity,
            "project_id": a.project_id
        }
        for a in db_activities
    ]

    # 3. Match report to schedule
    match_results = match_report_to_schedule(raw_text, activities_data)

    if not match_results:
        return IngestionResultSchema(
            report_id=report.id,
            source_type=source_type,
            filename=filename,
            raw_text=raw_text,
            extracted_text=raw_text,
            confidence_score=0.0,
            previous_progress=0.0,
            new_progress=0.0,
            audit_status="failed",
            reasoning="No matching activities found in schedule.",
            token_usage=token_usage
        )

    top_match = match_results[0]
    confidence_score = float(top_match["overallConfidence"])
    matched_act_data = top_match["activity"]
    matched_act_id = matched_act_data["id"]

    target_act = db.query(Activity).filter(Activity.id == matched_act_id).first()
    prev_progress = target_act.progress if target_act else float(matched_act_data.get("progress", 0.0))
    new_progress = float(top_match.get("extractedProgress", prev_progress))

    is_auto_approved = (confidence_score >= 78.0) and not force_pending_review
    audit_status = "auto_approved" if is_auto_approved else "pending_review"

    if is_auto_approved and target_act:
        target_act.progress = new_progress
        if new_progress >= 100.0:
            target_act.status = "completed"
        elif new_progress > 0.0:
            target_act.status = "in_progress"
        db.commit()

    notes_msg = override_notes or f"Source: {source_type} ({filename or 'direct input'}). {top_match['reasoning']}"

    # 4. Save Audit Record
    audit_record = AuditRecord(
        report_id=report.id,
        reportText=raw_text,
        matchedActivityId=matched_act_id,
        matchedActivityName=matched_act_data["name"],
        matchedZone=matched_act_data["zone"],
        previousProgress=prev_progress,
        newProgress=new_progress,
        confidenceScore=confidence_score,
        subScores=top_match["subScores"],
        status=audit_status,
        notes=notes_msg,
        filePath=file_path,
        mediaUrl=media_url,
        timestamp=datetime.utcnow().isoformat()
    )
    db.add(audit_record)
    db.commit()
    db.refresh(audit_record)

    return IngestionResultSchema(
        report_id=report.id,
        source_type=source_type,
        filename=filename,
        raw_text=raw_text,
        extracted_text=raw_text,
        matched_activity_id=matched_act_id,
        matched_activity_name=matched_act_data["name"],
        matched_zone=matched_act_data["zone"],
        confidence_score=confidence_score,
        sub_scores=top_match["subScores"],
        previous_progress=prev_progress,
        new_progress=new_progress,
        audit_record_id=audit_record.id,
        audit_status=audit_status,
        reasoning=top_match["reasoning"],
        token_usage=token_usage,
        matches=match_results
    )


# =====================================================================
# TASK 1 — Excel/CSV Ad-hoc Report Ingestion
# =====================================================================
@router.post("/reports/upload", tags=["Reports"])
@router.post("/ingest/excel", tags=["Reports"])
async def upload_reports_spreadsheet(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Task 1: Upload Excel (.xlsx) or CSV report containing batch activity updates.
    Returns {accepted: [...], rejected: [{row, reason}]}.
    """
    filename = file.filename or "upload.xlsx"
    fname_lower = filename.lower()
    
    if not (fname_lower.endswith(".xlsx") or fname_lower.endswith(".xls") or fname_lower.endswith(".csv")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload an Excel (.xlsx) or CSV (.csv) file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of 10MB ({len(file_bytes)} bytes uploaded)."
        )

    try:
        accepted_rows, rejected_rows = parse_report_spreadsheet(file_bytes, filename)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse spreadsheet file: {str(exc)}")

    accepted_results = []
    for row_data in accepted_rows:
        res = _process_text_and_audit(
            raw_text=row_data["raw_text"],
            source_type="excel",
            filename=filename,
            project_id=project_id,
            file_path=None,
            media_url=None,
            token_usage=None,
            db=db
        )
        accepted_results.append({
            "row": row_data["row"],
            "activity_name": row_data["activity_name"],
            "zone": row_data["zone"],
            "progress_percent": row_data["progress_percent"],
            "match_result": res
        })

    return {
        "filename": filename,
        "total_rows": len(accepted_rows) + len(rejected_rows),
        "accepted_count": len(accepted_results),
        "rejected_count": len(rejected_rows),
        "accepted": accepted_results,
        "rejected": rejected_rows
    }


# =====================================================================
# TASK 2 — Baseline Schedule Import (Excel/CSV only — Rejects .mpp/.xer)
# =====================================================================
@router.post("/projects/{project_id}/schedule/import", tags=["Activities"])
@router.post("/schedule/import", tags=["Activities"])
async def import_schedule_spreadsheet(
    project_id: Optional[str] = None,
    mode: str = Query("replace", description="Import mode: 'replace' existing schedule or 'append'"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Task 2: Import baseline schedule from Excel/CSV file.
    Rejects native MS Project (.mpp) and Primavera P6 (.xer) files with a clear error message.
    Bulk creates Activity records and refreshes schedule.
    """
    filename = file.filename or "schedule.xlsx"
    fname_lower = filename.lower()

    if fname_lower.endswith(".mpp") or fname_lower.endswith(".xer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Native MS Project (.mpp) and Primavera P6 (.xer) binary files are not supported directly. "
                "Please export your schedule to Excel (.xlsx) or CSV format from P6 / MS Project first and upload the exported spreadsheet."
            )
        )

    if not (fname_lower.endswith(".xlsx") or fname_lower.endswith(".xls") or fname_lower.endswith(".csv")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload an exported Excel (.xlsx) or CSV (.csv) schedule file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of 10MB."
        )

    try:
        accepted_acts, rejected_rows = parse_schedule_spreadsheet(file_bytes, filename)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse schedule file: {str(exc)}")

    # Default behavior: replace existing schedule matching ScheduleBuilder.tsx preset-switching pattern
    if mode == "replace":
        if project_id:
            db.query(Activity).filter(Activity.project_id == project_id).delete()
        else:
            db.query(Activity).delete()
        db.commit()

    created_activities = []
    for act_data in accepted_acts:
        act_obj = Activity(
            id=f"ACT-{uuid.uuid4().hex[:8]}",
            project_id=project_id,
            name=act_data["name"],
            category=act_data["category"],
            zone=act_data["zone"],
            planned_start=act_data["planned_start"],
            planned_end=act_data["planned_end"],
            status=act_data["status"],
            unit=act_data["unit"],
            target_quantity=act_data["target_quantity"],
            progress=act_data["progress"]
        )
        db.add(act_obj)
        created_activities.append(act_obj)

    db.commit()
    for a in created_activities:
        db.refresh(a)

    return {
        "filename": filename,
        "mode": mode,
        "imported_count": len(created_activities),
        "rejected_count": len(rejected_rows),
        "accepted": [ActivityOut.model_validate(a) for a in created_activities],
        "rejected": rejected_rows
    }


# =====================================================================
# TASK 3 — Image Processing: OCR + Defect Detection in One Endpoint
# =====================================================================
@router.post("/reports/upload-image", response_model=IngestionResultSchema, tags=["Reports"])
@router.post("/ingest/image", response_model=IngestionResultSchema, tags=["Ingestion & AI Vision"])
async def upload_report_image(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Task 3: Upload site photo for unified OCR + defect detection via Gemini Vision.
    Stores original image file, feeds extracted fields into match_report(),
    handles 429 rate limit errors gracefully, and writes an AuditRecord.
    """
    filename = file.filename or "site_photo.jpg"
    fname_lower = filename.lower()
    
    valid_exts = (".jpg", ".jpeg", ".png", ".webp", ".pdf")
    if not any(fname_lower.endswith(ext) for ext in valid_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{filename}'. Allowed formats: JPG, PNG, WEBP, PDF."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Image file exceeds maximum allowed size of 15MB ({len(file_bytes)} bytes uploaded)."
        )

    # Save original image to disk
    file_id = uuid.uuid4().hex[:10]
    safe_filename = f"{file_id}_{Path(filename).name}"
    saved_path = IMAGES_DIR / safe_filename
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    media_url = f"/uploads/images/{safe_filename}"
    mime_type = file.content_type or "image/jpeg"

    try:
        gemini_res = analyze_image_with_gemini(
            image_bytes=file_bytes,
            mime_type=mime_type,
            custom_prompt=prompt
        )
    except GeminiRateLimitError as rate_err:
        # Gracefully catch 429 / rate limit errors
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI processing temporarily unavailable, try again shortly"
        )
    except GeminiConfigError as cfg_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(cfg_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini image analysis error: {str(exc)}"
        )

    extracted_text = gemini_res["full_report_text"]
    token_usage = gemini_res.get("token_usage")

    return _process_text_and_audit(
        raw_text=extracted_text,
        source_type="image",
        filename=filename,
        project_id=project_id,
        file_path=str(saved_path),
        media_url=media_url,
        token_usage=token_usage,
        db=db
    )


# =====================================================================
# TASK 4 — Video Processing
# =====================================================================
@router.post("/reports/upload-video", response_model=IngestionResultSchema, tags=["Reports"])
@router.post("/ingest/video", response_model=IngestionResultSchema, tags=["Ingestion & AI Vision"])
async def upload_report_video(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Task 4: Upload site video file.
    Stores original video file, extracts keyframes for Gemini Vision analysis,
    matches against schedule, creates AuditRecord, and falls back to manual review if AI rate-limited.
    """
    filename = file.filename or "site_video.mp4"
    fname_lower = filename.lower()

    valid_exts = (".mp4", ".mov", ".avi", ".mkv", ".webm")
    if not any(fname_lower.endswith(ext) for ext in valid_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{filename}'. Allowed formats: MP4, MOV, AVI, MKV, WEBM."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Video file exceeds maximum allowed size of 50MB ({len(file_bytes)} bytes uploaded)."
        )

    # Save original video file to disk
    file_id = uuid.uuid4().hex[:10]
    safe_filename = f"{file_id}_{Path(filename).name}"
    saved_path = VIDEOS_DIR / safe_filename
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    media_url = f"/uploads/videos/{safe_filename}"
    mime_type = file.content_type or "video/mp4"

    try:
        gemini_res = analyze_video_with_gemini(
            video_bytes=file_bytes,
            mime_type=mime_type,
            custom_prompt=prompt
        )
        extracted_text = gemini_res["full_report_text"]
        token_usage = gemini_res.get("token_usage")
        force_pending = False
        notes_msg = None

    except GeminiRateLimitError:
        # If rate limited, store video attachment and flag for manual review
        extracted_text = f"Site video update uploaded ({filename}). AI video analysis temporarily rate-limited."
        token_usage = None
        force_pending = True
        notes_msg = "Video attachment saved; AI processing temporarily rate-limited (pending manual manager review)."

    except Exception as exc:
        extracted_text = f"Site video update uploaded ({filename}). AI analysis error: {str(exc)}"
        token_usage = None
        force_pending = True
        notes_msg = f"Video attachment saved; manual review required ({str(exc)})."

    return _process_text_and_audit(
        raw_text=extracted_text,
        source_type="video",
        filename=filename,
        project_id=project_id,
        file_path=str(saved_path),
        media_url=media_url,
        token_usage=token_usage,
        db=db,
        force_pending_review=force_pending,
        override_notes=notes_msg
    )
