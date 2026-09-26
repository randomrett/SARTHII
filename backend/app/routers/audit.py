from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.audit import AuditRecord
from app.models.activity import Activity
from app.schemas.audit import AuditRecordCreate, AuditRecordOut
from app.security import get_current_user_optional, verify_project_access
from app.routers.websocket import ws_manager, broadcast_sync

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

class ApproveReviewRequest(BaseModel):
    activity_id: Optional[str] = None
    new_progress: Optional[float] = None
    notes: Optional[str] = None

class RejectReviewRequest(BaseModel):
    notes: Optional[str] = None

@router.get("", response_model=List[AuditRecordOut])
def list_audit_records(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    query = db.query(AuditRecord)
    if status:
        query = query.filter(AuditRecord.status == status)
    return query.order_by(AuditRecord.id.desc()).all()

@router.get("/pending", response_model=List[AuditRecordOut])
def list_pending_reviews(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    return db.query(AuditRecord).filter(AuditRecord.status == "pending_review").order_by(AuditRecord.id.desc()).all()

@router.post("", response_model=AuditRecordOut, status_code=status.HTTP_201_CREATED)
def create_audit_record(
    audit_in: AuditRecordCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    # Deduplication check if id is provided
    if hasattr(audit_in, 'id') and getattr(audit_in, 'id', None):
        existing = db.query(AuditRecord).filter(AuditRecord.id == audit_in.id).first()
        if existing:
            return existing

    record = AuditRecord(
        id=getattr(audit_in, 'id', None) or None,
        report_id=audit_in.report_id,
        reportText=audit_in.reportText,
        matchedActivityId=audit_in.matchedActivityId,
        matchedActivityName=audit_in.matchedActivityName,
        matchedZone=audit_in.matchedZone,
        previousProgress=audit_in.previousProgress,
        newProgress=audit_in.newProgress,
        confidenceScore=audit_in.confidenceScore,
        subScores=audit_in.subScores,
        status=audit_in.status,
        notes=audit_in.notes,
        timestamp=audit_in.timestamp
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    broadcast_sync({
        "type": "AUDIT_RECORD_CREATED",
        "record_id": record.id,
        "status": record.status,
        "activity_name": record.matchedActivityName
    })

    return record

@router.post("/{record_id}/approve", response_model=AuditRecordOut)
def approve_audit_record(
    record_id: str,
    req: ApproveReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    record = db.query(AuditRecord).filter(AuditRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Audit record not found")

    target_act_id = req.activity_id or record.matchedActivityId
    act = db.query(Activity).filter(Activity.id == target_act_id).first()

    if req.new_progress is not None:
        record.newProgress = req.new_progress

    if act:
        target_progress = record.newProgress
        record.previousProgress = act.progress
        act.progress = target_progress
        if target_progress >= 100:
            act.status = 'completed'
        elif target_progress > 0:
            act.status = 'in_progress'

        record.matchedActivityId = act.id
        record.matchedActivityName = act.name
        record.matchedZone = act.zone

    is_corrected = req.activity_id and req.activity_id != record.matchedActivityId
    record.status = "corrected" if is_corrected else "manually_approved"
    if req.notes:
        record.notes = req.notes

    db.commit()
    db.refresh(record)

    broadcast_sync({
        "type": "REVIEW_APPROVED",
        "record_id": record.id,
        "status": record.status,
        "activity_id": record.matchedActivityId,
        "activity_name": record.matchedActivityName,
        "new_progress": record.newProgress
    })

    return record

@router.post("/{record_id}/reject", response_model=AuditRecordOut)
def reject_audit_record(
    record_id: str,
    req: RejectReviewRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    record = db.query(AuditRecord).filter(AuditRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Audit record not found")

    record.status = "rejected"
    if req.notes:
        record.notes = req.notes

    db.commit()
    db.refresh(record)

    broadcast_sync({
        "type": "REVIEW_REJECTED",
        "record_id": record.id,
        "status": record.status
    })

    return record
