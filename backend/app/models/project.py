from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: f"PRJ-{uuid.uuid4().hex[:8]}")
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    activities = relationship("Activity", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
