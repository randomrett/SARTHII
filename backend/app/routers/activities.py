from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityOut
from app.services.matching import refresh_schedule
from app.security import get_current_user_optional, verify_project_access

router = APIRouter(tags=["Activities"])

def _refresh_cache(db: Session):
    try:
        all_acts = db.query(Activity).all()
        acts_data = [{"id": a.id, "name": a.name, "zone": a.zone, "category": a.category, "status": a.status, "progress": a.progress} for a in all_acts]
        refresh_schedule(acts_data)
    except Exception:
        pass

@router.get("/activities", response_model=List[ActivityOut])
def list_all_activities(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    return db.query(Activity).all()

@router.get("/projects/{project_id}/activities", response_model=List[ActivityOut])
def list_project_activities(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    verify_project_access(project_id, db, current_user)
    return db.query(Activity).filter(Activity.project_id == project_id).all()

@router.post("/activities", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(
    act_in: ActivityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    if act_in.project_id:
        verify_project_access(act_in.project_id, db, current_user)

    activity = Activity(
        id=act_in.id if hasattr(act_in, 'id') and getattr(act_in, 'id', None) else None,
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
    _refresh_cache(db)
    return activity

@router.put("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: str,
    act_in: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    if activity.project_id:
        verify_project_access(activity.project_id, db, current_user)
        
    update_data = act_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(activity, field, val)

    db.commit()
    db.refresh(activity)
    _refresh_cache(db)
    return activity

@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.project_id:
        verify_project_access(activity.project_id, db, current_user)
    db.delete(activity)
    db.commit()
    _refresh_cache(db)
    return None
