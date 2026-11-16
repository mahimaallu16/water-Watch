from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel

class AISuggestionOut(BaseModel):
    id: str
    report_id: Optional[str] = None
    incident_id: Optional[str] = None
    suggestion_type: str
    suggested_value: Dict[str, Any]
    confidence_score: float
    reasoning: str
    review_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AISuggestionReview(BaseModel):
    review_status: str # accepted, rejected, overridden
    review_notes: Optional[str] = None

class ImageAnalysisResult(BaseModel):
    suggested_category: str
    confidence: float
    detected_features: List[str] = []
    explanation: str

class DuplicateDetectionResult(BaseModel):
    potential_duplicate_id: str
    similarity_score: float
    distance_meters: float
    time_diff_hours: float
    reasons: List[str] = []

class PriorityRecommendationResult(BaseModel):
    recommended_severity: str # low, medium, high, critical
    recommended_priority: str # p1, p2, p3, p4
    urgency_score: float # 0.0 to 100.0
    factors: Dict[str, Any]
    reasoning: str

class WorkerRecommendationResult(BaseModel):
    worker_id: str
    worker_name: str
    match_score: float
    active_tasks: int
    zone_match: bool
    specialization_match: bool
    distance_km: Optional[float] = None
    reasoning: str

