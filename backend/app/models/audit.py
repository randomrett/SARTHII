from sqlalchemy import Column, String, Float, Text, JSON
from app.database import Base
import uuid

class AuditRecord(Base):
    __tablename__ = "audit_records"

    id = Column(String, primary_key=True, default=lambda: f"AUD-{uuid.uuid4().hex[:8]}")
    report_id = Column(String, nullable=True)
    reportText = Column("report_text", Text, nullable=False)
    matchedActivityId = Column("matched_activity_id", String, nullable=False)
    matchedActivityName = Column("matched_activity_name", String, nullable=False)
    matchedZone = Column("matched_zone", String, nullable=False)
    previousProgress = Column("previous_progress", Float, nullable=False)
    newProgress = Column("new_progress", Float, nullable=False)
    confidenceScore = Column("confidence_score", Float, nullable=False)
    subScores = Column("sub_scores", JSON, nullable=True)
    status = Column(String, nullable=False) # auto_approved, manually_approved, corrected, rejected, pending_review
    notes = Column(Text, nullable=True)
    filePath = Column("file_path", String, nullable=True)
    mediaUrl = Column("media_url", String, nullable=True)
    timestamp = Column(String, nullable=False)
