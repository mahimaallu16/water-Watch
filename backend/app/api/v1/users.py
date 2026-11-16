from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserOut, UserUpdate, WorkerUpdate
from app.core.deps import get_current_user, require_admin
from app.models.user import User, CitizenProfile, WorkerProfile
from app.services.audit_service import audit_service
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/users", tags=["Users"])

@router.put("/profile", response_model=UserOut)
def update_profile(
    update_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile information for the current user."""
    if update_in.full_name is not None:
        current_user.full_name = update_in.full_name
    if update_in.phone is not None:
        current_user.phone = update_in.phone

    if current_user.role == "citizen" and current_user.citizen_profile:
        prof = current_user.citizen_profile
        if update_in.address is not None:
            prof.address = update_in.address
        if update_in.latitude is not None:
            prof.latitude = update_in.latitude
        if update_in.longitude is not None:
            prof.longitude = update_in.longitude
        if update_in.preferred_radius_km is not None:
            prof.preferred_radius_km = update_in.preferred_radius_km
        if update_in.notify_email is not None:
            prof.notify_email = update_in.notify_email
        if update_in.notify_in_app is not None:
            prof.notify_in_app = update_in.notify_in_app

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/workers", response_model=List[UserOut])
def list_workers(
    zone: Optional[str] = None,
    available_only: bool = False,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: List all maintenance workers with profiles."""
    q = db.query(User).filter(User.role == "worker", User.is_active == True)
    workers = q.all()

    if zone or available_only:
        filtered = []
        for w in workers:
            if not w.worker_profile:
                continue
            if zone and w.worker_profile.zone.lower() != zone.lower():
                continue
            if available_only and not w.worker_profile.is_available:
                continue
            filtered.append(w)
        return filtered

    return workers

@router.put("/workers/{worker_id}", response_model=UserOut)
def update_worker_status(
    worker_id: str,
    worker_in: WorkerUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Update worker availability, zone, or capacity."""
    worker = db.query(User).filter(User.id == worker_id, User.role == "worker").first()
    if not worker:
        raise NotFoundException("Worker", worker_id)

    prof = worker.worker_profile
    if not prof:
        prof = WorkerProfile(user_id=worker.id, employee_id=f"WKR-{worker.id[:6]}")
        db.add(prof)

    if worker_in.zone is not None:
        prof.zone = worker_in.zone
    if worker_in.specialization is not None:
        prof.specialization = worker_in.specialization
    if worker_in.max_active_tasks is not None:
        prof.max_active_tasks = worker_in.max_active_tasks
    if worker_in.is_available is not None:
        prof.is_available = worker_in.is_available
    if worker_in.current_latitude is not None:
        prof.current_latitude = worker_in.current_latitude
    if worker_in.current_longitude is not None:
        prof.current_longitude = worker_in.current_longitude

    db.commit()
    db.refresh(worker)
    return worker

