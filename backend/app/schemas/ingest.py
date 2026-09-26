from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.schemas.match import MatchResultSchema

class IngestionResultSchema(BaseModel):
    report_id: str
    source_type: str  # document, image, video, text
    filename: Optional[str] = None
    raw_text: str
    extracted_text: str
    matched_activity_id: Optional[str] = None
    matched_activity_name: Optional[str] = None
    matched_zone: Optional[str] = None
    confidence_score: float
    sub_scores: Optional[Dict[str, Any]] = None
    previous_progress: float
    new_progress: float
    audit_record_id: Optional[str] = None
    audit_status: str  # auto_approved, pending_review, failed
    reasoning: Optional[str] = None
    token_usage: Optional[Dict[str, Any]] = None
    matches: Optional[List[MatchResultSchema]] = None
