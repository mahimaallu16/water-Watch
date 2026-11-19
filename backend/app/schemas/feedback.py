from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Citizen rating from 1 (very dissatisfied) to 5 (very satisfied)")
    satisfaction_category: Optional[str] = Field(None, description="Category of satisfaction/concern, e.g. 'Fast Response', 'Clean Worksite'")
    comments: Optional[str] = Field(None, max_length=1000, description="Optional written feedback review from the citizen")

class FeedbackOut(BaseModel):
    id: str
    report_id: str
    citizen_id: str
    citizen_name: Optional[str] = None
    incident_id: Optional[str] = None
    rating: int
    satisfaction_category: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FeedbackStatsOut(BaseModel):
    total_reviews: int
    average_rating: float
    star_distribution: Dict[str, int]
