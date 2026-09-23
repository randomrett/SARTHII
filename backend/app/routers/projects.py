from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(proj_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        title=proj_in.title,
        description=proj_in.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
