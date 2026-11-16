from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import AISuggestionOut, AISuggestionReview, DuplicateDetectionResult, WorkerRecommendationResult
from app.schemas.report import DuplicateReviewRequest
from app.services.ai_service import ai_service
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI & Intelligence"])

@router.get("/suggestions", response_model=List[dict])
def get_ai_suggestions(
    report_id: Optional[str] = None,
    incident_id: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: View AI category, priority, duplicate, and assignment suggestions."""
    suggestions = ai_service.get_suggestions(db=db, report_id=report_id, incident_id=incident_id)
    results = []
    for s in suggestions:
        results.append({
            "id": s.id,
            "report_id": s.report_id,
            "incident_id": s.incident_id,
            "suggestion_type": s.suggestion_type,
            "suggested_value": s.suggested_value,
            "confidence_score": s.confidence_score,
            "reasoning": s.reasoning,
            "review_status": s.review_status,
            "reviewed_by": s.reviewed_by,
            "reviewed_at": s.reviewed_at,
            "review_notes": s.review_notes,
            "created_at": s.created_at
        })
    return results

@router.post("/suggestions/{suggestion_id}/review", response_model=dict)
def review_ai_suggestion(
    suggestion_id: str,
    review_in: AISuggestionReview,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Human-in-the-loop review of an AI suggestion (accept, reject, or override)."""
    sugg = ai_service.review_suggestion(
        db=db,
        suggestion_id=suggestion_id,
        review_status=review_in.review_status,
        admin=current_user,
        review_notes=review_in.review_notes
    )
    return {
        "id": sugg.id,
        "suggestion_type": sugg.suggestion_type,
        "review_status": sugg.review_status,
        "reviewed_at": sugg.reviewed_at
    }

@router.get("/duplicates", response_model=List[dict])
def list_duplicate_candidates(
    report_id: Optional[str] = None,
    status: Optional[str] = "detected",
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Review AI detected potential duplicate report candidates."""
    return ai_service.get_duplicate_candidates(db=db, report_id=report_id, status=status)

@router.post("/duplicates/{candidate_id}/review", response_model=dict)
def review_duplicate_candidate(
    candidate_id: str,
    review_req: DuplicateReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Confirm or dismiss duplicate report, optionally linking to an incident."""
    candidate = ai_service.review_duplicate(
        db=db,
        candidate_id=candidate_id,
        review_req=review_req,
        admin=current_user
    )
    return {
        "id": candidate.id,
        "status": candidate.status,
        "reviewed_at": candidate.reviewed_at
    }

@router.get("/incidents/{incident_id}/recommended-workers", response_model=List[dict])
def get_worker_recommendations(
    incident_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Get AI recommendation ranking of workers for an incident."""
    return ai_service.get_worker_recommendations(db=db, incident_id=incident_id)

