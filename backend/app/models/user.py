from sqlalchemy import Column, String, DateTime
from datetime import datetime
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: f"USR-{uuid.uuid4().hex[:8]}")
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="supervisor")
    created_at = Column(DateTime, default=datetime.utcnow)
