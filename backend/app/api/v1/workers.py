from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.assignment_service import assignment_service
from app.services.team_service import team_service
from app.schemas.team import WorkerRegisterByAdmin
from app.schemas.user import UserOut
from app.api.dependencies.auth import require_worker, require_admin
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
    """Field Worker: View list of assignments authorized for this worker."""
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
    """Field Worker: View personal task turnaround, active assignments, and completion stats."""
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

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_worker_admin(
    worker_in: WorkerRegisterByAdmin,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Register a new field maintenance worker through the authorized administrative workflow."""
    return team_service.register_worker(db, worker_in, current_user)
