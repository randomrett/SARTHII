from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityOut

router = APIRouter(tags=["Activities"])

@router.get("/activities", response_model=List[ActivityOut])
def list_all_activities(db: Session = Depends(get_db)):
    return db.query(Activity).all()

@router.get("/projects/{project_id}/activities", response_model=List[ActivityOut])
def list_project_activities(project_id: str, db: Session = Depends(get_db)):
    return db.query(Activity).filter(Activity.project_id == project_id).all()

@router.post("/activities", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(act_in: ActivityCreate, db: Session = Depends(get_db)):
    activity = Activity(
        project_id=act_in.project_id,
        name=act_in.name,
        zone=act_in.zone,
        planned_start=act_in.planned_start,
        planned_end=act_in.planned_end,
        progress=act_in.progress,
        status=act_in.status,
        category=act_in.category,
        unit=act_in.unit,
        target_quantity=act_in.target_quantity,
        completed_quantity=act_in.completed_quantity
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

@router.put("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: str, act_in: ActivityUpdate, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = act_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(activity, field, val)

    db.commit()
    db.refresh(activity)
    return activity

@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
    return None
