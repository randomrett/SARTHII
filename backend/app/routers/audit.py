from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.audit import AuditRecord
from app.schemas.audit import AuditRecordCreate, AuditRecordOut

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditRecordOut])
def list_audit_records(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AuditRecord)
    if status:
        query = query.filter(AuditRecord.status == status)
    return query.all()

@router.post("", response_model=AuditRecordOut, status_code=status.HTTP_201_CREATED)
def create_audit_record(audit_in: AuditRecordCreate, db: Session = Depends(get_db)):
    record = AuditRecord(
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
    return record
