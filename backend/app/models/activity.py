from sqlalchemy import Column, String, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=lambda: f"ACT-{uuid.uuid4().hex[:8]}")
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    name = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    planned_start = Column(String, nullable=False) # YYYY-MM-DD
    planned_end = Column(String, nullable=False)   # YYYY-MM-DD
    progress = Column(Float, default=0.0)          # 0 - 100
    status = Column(String, default="not_started") # not_started, in_progress, delayed, completed
    category = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    target_quantity = Column(Float, nullable=True)
    completed_quantity = Column(Float, nullable=True)

    project = relationship("Project", back_populates="activities")
