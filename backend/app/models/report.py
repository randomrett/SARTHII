from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: f"REP-{uuid.uuid4().hex[:8]}")
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    raw_text = Column(Text, nullable=False)
    submitted_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="reports")
