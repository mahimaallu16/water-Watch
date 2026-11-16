from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.ai import AISuggestion
from app.models.report import Report, DuplicateCandidate
from app.models.incident import Incident, ReportIncidentLink
from app.models.user import User, WorkerProfile
from app.models.assignment import Assignment
from app.schemas.report import DuplicateReviewRequest
from app.ai.worker_recommender import worker_recommender_engine
from app.services.incident_service import incident_service
from app.services.audit_service import audit_service
from app.core.exceptions import NotFoundException, BadRequestException

class AIService:
    @staticmethod
    def get_suggestions(
        db: Session,
        report_id: Optional[str] = None,
        incident_id: Optional[str] = None
    ) -> List[AISuggestion]:
        q = db.query(AISuggestion)
        if report_id:
            q = q.filter(AISuggestion.report_id == report_id)
        if incident_id:
            q = q.filter(AISuggestion.incident_id == incident_id)
        return q.order_by(AISuggestion.created_at.desc()).all()

    @staticmethod
    def review_suggestion(
        db: Session,
        suggestion_id: str,
        review_status: str, # accepted, rejected, overridden
        admin: User,
        review_notes: Optional[str] = None
    ) -> AISuggestion:
        sugg = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if not sugg:
            raise NotFoundException("AISuggestion", suggestion_id)

        sugg.review_status = review_status
        sugg.reviewed_by = admin.id
        sugg.reviewed_at = datetime.now(timezone.utc)
        sugg.review_notes = review_notes

        audit_service.log_action(
            db=db,
            action="REVIEW_AI_SUGGESTION",
            entity_type="ai_suggestion",
            entity_id=sugg.id,
            user_id=admin.id,
            new_values={"review_status": review_status, "suggestion_type": sugg.suggestion_type}
        )

        db.commit()
        db.refresh(sugg)
        return sugg

    @staticmethod
    def get_duplicate_candidates(
        db: Session,
        report_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[dict]:
        q = db.query(DuplicateCandidate)
        if report_id:
            q = q.filter(DuplicateCandidate.report_id == report_id)
        if status:
            q = q.filter(DuplicateCandidate.status == status)

        candidates = q.order_by(DuplicateCandidate.similarity_score.desc()).all()
        results = []
        for c in candidates:
            orig = db.query(Report).filter(Report.id == c.report_id).first()
            pot = db.query(Report).filter(Report.id == c.potential_duplicate_report_id).first()
            results.append({
                "id": c.id,
                "report_id": c.report_id,
                "report_number": orig.report_number if orig else "Unknown",
                "report_title": orig.title if orig else "Unknown",
                "report_category": orig.category if orig else "Unknown",
                "report_address": orig.address_text if orig else "",
                "potential_duplicate_report_id": c.potential_duplicate_report_id,
                "potential_report_number": pot.report_number if pot else "Unknown",
                "potential_report_title": pot.title if pot else "Unknown",
                "potential_report_category": pot.category if pot else "Unknown",
                "potential_report_address": pot.address_text if pot else "",
                "similarity_score": c.similarity_score,
                "distance_meters": c.distance_meters,
                "time_diff_hours": c.time_diff_hours,
                "text_similarity": c.text_similarity,
                "category_match": c.category_match,
                "status": c.status,
                "reviewed_at": c.reviewed_at,
                "created_at": c.created_at
            })
        return results

    @staticmethod
    def review_duplicate(
        db: Session,
        candidate_id: str,
        review_req: DuplicateReviewRequest,
        admin: User
    ) -> DuplicateCandidate:
        candidate = db.query(DuplicateCandidate).filter(DuplicateCandidate.id == candidate_id).first()
        if not candidate:
            raise NotFoundException("DuplicateCandidate", candidate_id)

        candidate.status = review_req.status # confirmed_duplicate or dismissed
        candidate.reviewed_by = admin.id
        candidate.reviewed_at = datetime.now(timezone.utc)

        # If admin decided to link them into the same incident
        if review_req.link_to_incident and review_req.incident_id:
            incident = db.query(Incident).filter(Incident.id == review_req.incident_id).first()
            if incident:
                # Link potential duplicate report if not linked
                link_exists = db.query(ReportIncidentLink).filter(ReportIncidentLink.report_id == candidate.potential_duplicate_report_id).first()
                if not link_exists:
                    incident_service.link_report(
                        db=db,
                        incident_id=incident.id,
                        report_id=candidate.potential_duplicate_report_id,
                        admin=admin,
                        notes="Linked after duplicate candidate confirmation"
                    )

        audit_service.log_action(
            db=db,
            action="REVIEW_DUPLICATE_CANDIDATE",
            entity_type="duplicate_candidate",
            entity_id=candidate.id,
            user_id=admin.id,
            new_values={"status": candidate.status, "link_to_incident": review_req.link_to_incident}
        )

        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def get_worker_recommendations(db: Session, incident_id: str) -> List[Dict[str, Any]]:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundException("Incident", incident_id)

        workers = db.query(User).filter(User.role == "worker", User.is_active == True).all()
        worker_data_list = []

        for w in workers:
            profile = w.worker_profile
            # Active tasks count
            active_count = db.query(Assignment).filter(
                Assignment.worker_id == w.id,
                Assignment.status.in_(["assigned", "accepted", "in_progress", "rework_required"])
            ).count()

            worker_data_list.append({
                "user_id": w.id,
                "full_name": w.full_name,
                "employee_id": profile.employee_id if profile else "EMP-001",
                "zone": profile.zone if profile else "Central",
                "specialization": profile.specialization if profile else "General Plumbing",
                "max_active_tasks": profile.max_active_tasks if profile else 5,
                "is_available": profile.is_available if profile else True,
                "current_latitude": profile.current_latitude if profile else None,
                "current_longitude": profile.current_longitude if profile else None,
                "active_tasks_count": active_count
            })

        recommendations = worker_recommender_engine.rank_workers(
            incident_category=incident.category,
            incident_zone=incident.zone,
            incident_lat=incident.latitude,
            incident_lon=incident.longitude,
            available_workers=worker_data_list
        )

        return recommendations

ai_service = AIService()

