from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackStatsOut
from app.services.feedback_service import feedback_service
from app.core.deps import get_current_user, require_any_authenticated
from app.models.user import User

router = APIRouter(tags=["Citizen Feedback"])

@router.post("/reports/{report_id}/feedback", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_citizen_feedback(
    report_id: str,
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Citizen: Rate repair quality (1-5 stars) and submit satisfaction review for a resolved report."""
    return feedback_service.create_or_update_feedback(
        db=db,
        report_id=report_id,
        citizen=current_user,
        feedback_in=feedback_in
    )

@router.get("/reports/{report_id}/feedback", response_model=Optional[dict])
def get_report_feedback(
    report_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Get feedback review submitted for a specific report."""
    return feedback_service.get_feedback_by_report(db=db, report_id=report_id)

@router.get("/incidents/{incident_id}/feedback", response_model=List[dict])
def get_incident_feedback(
    incident_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Admin & Staff: Get all citizen satisfaction feedback reviews associated with an incident."""
    return feedback_service.get_feedback_by_incident(db=db, incident_id=incident_id)

@router.get("/feedback/stats", response_model=dict)
def get_feedback_stats(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Get overall citizen satisfaction metrics (average rating, review volume, star distribution)."""
    return feedback_service.get_stats(db=db)
