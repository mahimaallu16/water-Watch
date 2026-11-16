from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.assignment import AssignmentCreate, RepairUpdateCreate, VerificationRequest, AssignmentOut
from app.services.assignment_service import assignment_service
from app.services.incident_service import incident_service
from app.core.deps import get_current_user, require_admin, require_worker, require_any_authenticated
from app.models.user import User

router = APIRouter(prefix="/assignments", tags=["Assignments & Repairs"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def assign_worker(
    assign_in: AssignmentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Assign a field worker to an active incident."""
    assignment = assignment_service.assign_worker(db, assign_in, current_user)
    return incident_service.get_incident_detail(db, assignment.incident_id)

@router.post("/{assignment_id}/accept", response_model=dict)
def accept_assignment(
    assignment_id: str,
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Accept assignment and mark incident as In Progress."""
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
    """Administrator: Inspect repair evidence and approve or reject resolution."""
    incident = assignment_service.verify_resolution(
        db=db,
        incident_id=incident_id,
        verification=verification,
        admin=current_user
    )
    return incident_service.get_incident_detail(db, incident.id)

