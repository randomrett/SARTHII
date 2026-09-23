from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    project_id: Optional[str] = None
    raw_text: str

class ReportOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    raw_text: str
    submitted_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
