from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class ReportImageOut(BaseModel):
    id: str
    image_url: str
    file_name: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    title: str
    category: str # pipe_leak, overflow, damaged_valve, low_pressure, contamination, other
    description: str
    estimated_flow: Optional[str] = "moderate_stream" # trickle, moderate_stream, heavy_flow, gushing_geyser
    affected_households: Optional[int] = 1
    latitude: float
    longitude: float
    address_text: str
    landmark: Optional[str] = None

class ReportUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    estimated_flow: Optional[str] = None
    affected_households: Optional[int] = None
    status: Optional[str] = None
    landmark: Optional[str] = None

class DuplicateCandidateOut(BaseModel):
    id: str
    report_id: str
    potential_duplicate_report_id: str
    similarity_score: float
    distance_meters: float
    time_diff_hours: float
    text_similarity: float
    category_match: bool
    status: str
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    potential_report_title: Optional[str] = None
    potential_report_number: Optional[str] = None

    class Config:
        from_attributes = True

class DuplicateReviewRequest(BaseModel):
    status: str # confirmed_duplicate, dismissed
    link_to_incident: Optional[bool] = False
    incident_id: Optional[str] = None
    notes: Optional[str] = None

class ReportOut(BaseModel):
    id: str
    citizen_id: str
    report_number: str
    title: str
    category: str
    description: str
    estimated_flow: str
    affected_households: int
    latitude: float
    longitude: float
    address_text: str
    landmark: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    images: List[ReportImageOut] = []
    citizen_name: Optional[str] = None
    linked_incident_id: Optional[str] = None
    linked_incident_number: Optional[str] = None

    class Config:
        from_attributes = True

class AdditionalEvidenceSubmit(BaseModel):
    notes: Optional[str] = None

