from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ProjectOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
