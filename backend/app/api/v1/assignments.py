from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.assignment import (
    AssignmentCreate,
    ReassignRequest,
    RepairUpdateCreate,
    VerificationRequest,
    AssignmentOut
)
from app.services.assignment_service import assignment_service
from app.services.incident_service import incident_service
from app.api.dependencies.auth import (
    get_current_user,
    require_admin,
    require_worker,
    require_any_authenticated
)
from app.models.user import User

router = APIRouter(prefix="/assignments", tags=["Assignments & Repairs"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def assign_worker(
    assign_in: AssignmentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Assign a field worker or crew to an active incident."""
    assignment = assignment_service.assign_worker(db, assign_in, current_user)
    return incident_service.get_incident_detail(db, assignment.incident_id)

@router.post("/reassign", response_model=dict)
def reassign_worker(
    reassign_in: ReassignRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Reassign an active incident to a different field worker."""
    new_assignment = assignment_service.reassign_worker(
        db=db,
        incident_id=reassign_in.incident_id,
        new_worker_id=reassign_in.new_worker_id,
        admin=current_user,
        instructions=reassign_in.instructions
    )
    return incident_service.get_incident_detail(db, new_assignment.incident_id)

@router.get("/{assignment_id}", response_model=dict)
def get_assignment(
    assignment_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """
    Get full details of a specific assignment.
    Workers are restricted to viewing only their authorized assignments.
    """
    return assignment_service.get_assignment_detail(db, assignment_id, current_user)

@router.get("/incident/{incident_id}/history", response_model=List[dict])
def get_incident_assignment_history(
    incident_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """View the complete assignment and reassignment history for an incident."""
    return assignment_service.get_incident_assignments(db, incident_id)

@router.post("/{assignment_id}/accept", response_model=dict)
def accept_assignment(
    assignment_id: str,
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Accept assigned incident and mark status as In Progress."""
    assignment = assignment_service.accept_assignment(db, assignment_id, current_user)
    return incident_service.get_incident_detail(db, assignment.incident_id)

@router.post("/{assignment_id}/updates", response_model=dict)
def add_repair_update(
    assignment_id: str,
    update_in: RepairUpdateCreate,
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Post a status/progress note (arrival, delays, parts used)."""
    update = assignment_service.add_repair_update(
        db=db,
        assignment_id=assignment_id,
        update_type=update_in.update_type,
        notes=update_in.notes,
        worker=current_user
    )
    return {
        "id": update.id,
        "update_type": update.update_type,
        "notes": update.notes,
        "timestamp": update.timestamp
    }

@router.post("/{assignment_id}/evidence", response_model=dict)
def upload_repair_evidence(
    assignment_id: str,
    evidence_type: str = Form(...), # before, in_progress, after
    notes: Optional[str] = Form(None),
    materials_used: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Upload before/after repair photographs with validation."""
    evidence = assignment_service.upload_evidence(
        db=db,
        assignment_id=assignment_id,
        evidence_type=evidence_type,
        image_file=image,
        notes=notes,
        materials_used=materials_used,
        worker=current_user
    )
    return {
        "id": evidence.id,
        "evidence_type": evidence.evidence_type,
        "image_url": evidence.image_url,
        "notes": evidence.notes,
        "materials_used": evidence.materials_used,
        "uploaded_at": evidence.uploaded_at
    }

@router.post("/{assignment_id}/complete", response_model=dict)
def submit_completion(
    assignment_id: str,
    notes: Optional[str] = Form(None),
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Submit completed repair for administrator verification."""
    assignment = assignment_service.submit_completion(
        db=db,
        assignment_id=assignment_id,
        notes=notes,
        worker=current_user
    )
    return incident_service.get_incident_detail(db, assignment.incident_id)

@router.post("/incidents/{incident_id}/verify", response_model=dict)
def verify_repair_resolution(
    incident_id: str,
    verification: VerificationRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator: Inspect repair evidence and approve or reject resolution.
    If approved: Incident and all linked reports transition to resolved.
    If rejected: Incident returns to in_progress, requesting rework from technician.
    """
    incident = assignment_service.verify_resolution(
        db=db,
        incident_id=incident_id,
        verification=verification,
        admin=current_user
    )
    return incident_service.get_incident_detail(db, incident.id)
