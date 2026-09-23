from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.schemas.match import SubScoresSchema

class AuditRecordCreate(BaseModel):
    report_id: Optional[str] = None
    reportText: str
    matchedActivityId: str
    matchedActivityName: str
    matchedZone: str
    previousProgress: float
    newProgress: float
    confidenceScore: float
    subScores: Optional[Dict[str, Any]] = None
    status: str # auto_approved, manually_approved, corrected, rejected
    notes: Optional[str] = None
    timestamp: str

class AuditRecordOut(AuditRecordCreate):
    id: str

    class Config:
        from_attributes = True
