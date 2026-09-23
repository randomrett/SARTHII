from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.report import Report
from app.models.activity import Activity
from app.schemas.match import MatchRequest, MatchResultSchema
from app.utils.matching import match_report_to_schedule

router = APIRouter(tags=["Matching Engine"])

@router.post("/match", response_model=List[MatchResultSchema])
def match_standalone(request: MatchRequest, db: Session = Depends(get_db)):

    report_text = request.report_text
    
    if request.activities and len(request.activities) > 0:
        activities_data = [act.model_dump() for act in request.activities]
    else:
        db_activities = db.query(Activity).all()
        activities_data = [
            {
                "id": a.id,
                "name": a.name,
                "zone": a.zone,
                "planned_start": a.planned_start,
                "planned_end": a.planned_end,
                "progress": a.progress,
                "status": a.status,
                "category": a.category,
                "unit": a.unit,
                "target_quantity": a.target_quantity,
                "completed_quantity": a.completed_quantity,
                "project_id": a.project_id
            }
            for a in db_activities
        ]

    results = match_report_to_schedule(report_text, activities_data)
    return results

@router.post("/reports/{report_id}/match", response_model=List[MatchResultSchema])
def match_saved_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.project_id:
        db_activities = db.query(Activity).filter(Activity.project_id == report.project_id).all()
    else:
        db_activities = db.query(Activity).all()

    activities_data = [
        {
            "id": a.id,
            "name": a.name,
            "zone": a.zone,
            "planned_start": a.planned_start,
            "planned_end": a.planned_end,
            "progress": a.progress,
            "status": a.status,
            "category": a.category,
            "unit": a.unit,
            "target_quantity": a.target_quantity,
            "completed_quantity": a.completed_quantity,
            "project_id": a.project_id
        }
        for a in db_activities
    ]

    results = match_report_to_schedule(report.raw_text, activities_data)
    return results
