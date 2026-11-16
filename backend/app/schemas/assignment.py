from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class AssignmentCreate(BaseModel):
    incident_id: str
    worker_id: str
    instructions: Optional[str] = None
    priority: Optional[str] = "p3"

class AssignmentUpdate(BaseModel):
    status: Optional[str] = None # accepted, in_progress, completed
    instructions: Optional[str] = None

class RepairUpdateCreate(BaseModel):
    update_type: str # status_change, arrival, parts_requested, delay_notice, completion_note
    notes: str

class RepairUpdateOut(BaseModel):
    id: str
    assignment_id: str
    incident_id: str
    worker_id: str
    worker_name: Optional[str] = None
    update_type: str
    notes: str
    timestamp: datetime

    class Config:
        from_attributes = True

class RepairEvidenceCreate(BaseModel):
    evidence_type: str # before, in_progress, after
    notes: Optional[str] = None
    materials_used: Optional[str] = None

class RepairEvidenceOut(BaseModel):
    id: str
    assignment_id: str
    incident_id: str
    worker_id: str
    worker_name: Optional[str] = None
    evidence_type: str
    image_url: str
    notes: Optional[str] = None
    materials_used: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class VerificationRequest(BaseModel):
    approved: bool # True = resolve incident, False = rework required
    feedback_notes: Optional[str] = None

class AssignmentOut(BaseModel):
    id: str
    incident_id: str
    incident_number: Optional[str] = None
    incident_title: Optional[str] = None
    incident_category: Optional[str] = None
    incident_severity: Optional[str] = None
    incident_priority: Optional[str] = None
    incident_status: Optional[str] = None
    incident_latitude: Optional[float] = None
    incident_longitude: Optional[float] = None
    incident_address: Optional[str] = None
    worker_id: str
    worker_name: Optional[str] = None
    assigned_by: str
    assigner_name: Optional[str] = None
    status: str
    instructions: Optional[str] = None
    priority: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updates: List[RepairUpdateOut] = []
    evidence: List[RepairEvidenceOut] = []

    class Config:
        from_attributes = True

