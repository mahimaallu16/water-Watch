from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.report import ReportOut

class IncidentCreate(BaseModel):
    title: str
    category: str
    description: str
    severity: str = "medium" # low, medium, high, critical
    priority: str = "p3" # p1, p2, p3, p4
    latitude: float
    longitude: float
    address_text: str
    zone: Optional[str] = "Central"
    target_resolution_at: Optional[datetime] = None
    initial_report_id: Optional[str] = None # Link initial report right away

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    zone: Optional[str] = None
    target_resolution_at: Optional[datetime] = None

class ReportIncidentLinkCreate(BaseModel):
    report_id: str
    notes: Optional[str] = None

class IncidentOut(BaseModel):
    id: str
    incident_number: str
    title: str
    category: str
    description: str
    severity: str
    priority: str
    status: str
    latitude: float
    longitude: float
    address_text: str
    zone: str
    created_by: str
    target_resolution_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    linked_reports_count: int = 0
    active_worker_name: Optional[str] = None
    active_worker_id: Optional[str] = None

    class Config:
        from_attributes = True

class IncidentDetailOut(IncidentOut):
    linked_reports: List[ReportOut] = []
    assignments: List[dict] = []
    evidence: List[dict] = []
    status_history: List[dict] = []

