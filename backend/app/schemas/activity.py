from pydantic import BaseModel
from typing import Optional

class ActivityBase(BaseModel):
    name: str
    zone: str
    planned_start: str # YYYY-MM-DD
    planned_end: str   # YYYY-MM-DD
    progress: float = 0.0
    status: str = "not_started"
    category: Optional[str] = None
    unit: Optional[str] = None
    target_quantity: Optional[float] = None
    completed_quantity: Optional[float] = None

class ActivityCreate(ActivityBase):
    project_id: Optional[str] = None

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    zone: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    progress: Optional[float] = None
    status: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    target_quantity: Optional[float] = None
    completed_quantity: Optional[float] = None

class ActivityOut(ActivityBase):
    id: str
    project_id: Optional[str] = None

    class Config:
        from_attributes = True
