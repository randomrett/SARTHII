from pydantic import BaseModel
from typing import List, Optional
from app.schemas.activity import ActivityOut

class SubScoresSchema(BaseModel):
    semanticMatch: float
    locationMatch: float
    datePlausibility: float
    progressConfidence: float

class ExtractedEntitiesSchema(BaseModel):
    activityNameKeywords: List[str]
    zoneKeyword: Optional[str] = None
    extractedProgress: Optional[float] = None
    isCompletedMention: bool
    isDelayMention: bool
    extractedDate: Optional[str] = None
    extractedNotes: str

class MatchResultSchema(BaseModel):
    activity: ActivityOut
    overallConfidence: float
    subScores: SubScoresSchema
    extractedProgress: float
    extractedEntities: ExtractedEntitiesSchema
    reasoning: str
    isHighConfidence: bool

class MatchRequest(BaseModel):
    report_text: str
    activities: Optional[List[ActivityOut]] = None
