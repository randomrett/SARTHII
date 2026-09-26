from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportOut
from app.security import get_current_user_optional, verify_project_access

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=List[ReportOut])
def list_reports(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if project_id:
        verify_project_access(project_id, db, current_user)
        query = db.query(Report).filter(Report.project_id == project_id)
    else:
        query = db.query(Report)
    return query.order_by(Report.created_at.desc()).all()

@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    rep_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if rep_in.project_id:
        verify_project_access(rep_in.project_id, db, current_user)

    # Task 2: Deduplication on idempotency_key
    if rep_in.idempotency_key:
        existing = db.query(Report).filter(Report.idempotency_key == rep_in.idempotency_key).first()
        if existing:
            return existing

    report = Report(
        project_id=rep_in.project_id,
        raw_text=rep_in.raw_text,
        idempotency_key=rep_in.idempotency_key,
        submitted_by=current_user.email if current_user else "supervisor"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.project_id:
        verify_project_access(report.project_id, db, current_user)
    return report
