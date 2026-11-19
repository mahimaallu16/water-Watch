from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.feedback import CitizenFeedback
from app.models.report import Report
from app.models.user import User
from app.schemas.feedback import FeedbackCreate
from app.services.audit_service import audit_service
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException

class FeedbackService:
    @staticmethod
    def create_or_update_feedback(
        db: Session,
        report_id: str,
        citizen: User,
        feedback_in: FeedbackCreate
    ) -> Dict[str, Any]:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise NotFoundException("Report", report_id)

        # Ensure user is the creator of the report, or admin
        if report.citizen_id != citizen.id and citizen.role not in ("admin", "superadmin"):
            raise ForbiddenException("You can only submit feedback for your own reports.")

        # Ensure report is resolved before rating
        if report.status != "resolved":
            raise BadRequestException("Feedback can only be submitted once the repair is resolved.")

        # Get linked incident if present
        incident_id = report.incident_link.incident_id if report.incident_link else None

        existing_feedback = db.query(CitizenFeedback).filter(CitizenFeedback.report_id == report_id).first()
        now = datetime.now(timezone.utc)

        if existing_feedback:
            existing_feedback.rating = feedback_in.rating
            existing_feedback.satisfaction_category = feedback_in.satisfaction_category
            existing_feedback.comments = feedback_in.comments
            existing_feedback.incident_id = incident_id
            existing_feedback.updated_at = now
            feedback_record = existing_feedback
            action = "UPDATE_FEEDBACK"
        else:
            feedback_record = CitizenFeedback(
                report_id=report.id,
                citizen_id=citizen.id,
                incident_id=incident_id,
                rating=feedback_in.rating,
                satisfaction_category=feedback_in.satisfaction_category,
                comments=feedback_in.comments,
                created_at=now,
                updated_at=now
            )
            db.add(feedback_record)
            action = "SUBMIT_FEEDBACK"

        db.commit()
        db.refresh(feedback_record)

        # Audit logging
        audit_service.log_action(
            db=db,
            action=action,
            entity_type="report",
            entity_id=report.id,
            user_id=citizen.id,
            new_values={
                "rating": feedback_record.rating,
                "category": feedback_record.satisfaction_category,
                "has_comments": bool(feedback_record.comments)
            }
        )

        return {
            "id": feedback_record.id,
            "report_id": feedback_record.report_id,
            "citizen_id": feedback_record.citizen_id,
            "citizen_name": citizen.full_name,
            "incident_id": feedback_record.incident_id,
            "rating": feedback_record.rating,
            "satisfaction_category": feedback_record.satisfaction_category,
            "comments": feedback_record.comments,
            "created_at": feedback_record.created_at,
            "updated_at": feedback_record.updated_at
        }

    @staticmethod
    def get_feedback_by_report(db: Session, report_id: str) -> Optional[Dict[str, Any]]:
        feedback = db.query(CitizenFeedback).filter(CitizenFeedback.report_id == report_id).first()
        if not feedback:
            return None

        citizen = db.query(User).filter(User.id == feedback.citizen_id).first()
        return {
            "id": feedback.id,
            "report_id": feedback.report_id,
            "citizen_id": feedback.citizen_id,
            "citizen_name": citizen.full_name if citizen else "Resident",
            "incident_id": feedback.incident_id,
            "rating": feedback.rating,
            "satisfaction_category": feedback.satisfaction_category,
            "comments": feedback.comments,
            "created_at": feedback.created_at,
            "updated_at": feedback.updated_at
        }

    @staticmethod
    def get_feedback_by_incident(db: Session, incident_id: str) -> List[Dict[str, Any]]:
        feedbacks = db.query(CitizenFeedback).filter(CitizenFeedback.incident_id == incident_id).all()
        results = []
        for fb in feedbacks:
            citizen = db.query(User).filter(User.id == fb.citizen_id).first()
            results.append({
                "id": fb.id,
                "report_id": fb.report_id,
                "citizen_id": fb.citizen_id,
                "citizen_name": citizen.full_name if citizen else "Resident",
                "incident_id": fb.incident_id,
                "rating": fb.rating,
                "satisfaction_category": fb.satisfaction_category,
                "comments": fb.comments,
                "created_at": fb.created_at,
                "updated_at": fb.updated_at
            })
        return results

    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        feedbacks = db.query(CitizenFeedback).all()
        total = len(feedbacks)
        if total == 0:
            return {
                "total_reviews": 0,
                "average_rating": 0.0,
                "star_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            }

        avg = sum(f.rating for f in feedbacks) / total
        star_distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
        for f in feedbacks:
            key = str(f.rating)
            if key in star_distribution:
                star_distribution[key] += 1

        return {
            "total_reviews": total,
            "average_rating": round(avg, 2),
            "star_distribution": star_distribution
        }

feedback_service = FeedbackService()
