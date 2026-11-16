from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.assignment_service import assignment_service
from app.core.deps import require_worker
from app.models.user import User
from app.models.assignment import Assignment
from app.models.incident import Incident

router = APIRouter(prefix="/workers", tags=["Field Workers"])

@router.get("/assignments", response_model=List[dict])
def get_my_assignments(
    status: Optional[str] = None,
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: View list of assigned incidents."""
    return assignment_service.get_worker_assignments(
        db=db,
        worker_id=current_user.id,
        status=status
    )

@router.get("/stats", response_model=dict)
def get_my_stats(
    current_user: User = Depends(require_worker),
    db: Session = Depends(get_db)
):
    """Field Worker: Performance stats and summary counts."""
    completed = db.query(Assignment).filter(
        Assignment.worker_id == current_user.id,
        Assignment.status == "completed"
    ).count()

    active = db.query(Assignment).filter(
        Assignment.worker_id == current_user.id,
        Assignment.status.in_(["assigned", "accepted", "in_progress", "rework_required"])
    ).count()

    resolved = db.query(Incident).join(
        Assignment, Assignment.incident_id == Incident.id
    ).filter(
        Assignment.worker_id == current_user.id,
        Incident.status.in_(["resolved", "closed"])
    ).count()

    return {
        "completed_jobs": completed,
        "active_jobs": active,
        "verified_resolved_jobs": resolved,
        "zone": current_user.worker_profile.zone if current_user.worker_profile else "Central",
        "specialization": current_user.worker_profile.specialization if current_user.worker_profile else "General Plumbing"
    }

