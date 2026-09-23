from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportOut

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=List[ReportOut])
def list_reports(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Report)
    if project_id:
        query = query.filter(Report.project_id == project_id)
    return query.order_by(Report.created_at.desc()).all()

@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(rep_in: ReportCreate, db: Session = Depends(get_db)):
    report = Report(
        project_id=rep_in.project_id,
        raw_text=rep_in.raw_text
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
