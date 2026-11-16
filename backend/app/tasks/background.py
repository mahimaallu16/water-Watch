import os
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.report import Report, ReportImage, DuplicateCandidate
from app.models.ai import AISuggestion
from app.models.user import User
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.ai.image_classifier import image_analysis_engine
from app.ai.duplicate_detector import duplicate_detection_engine
from app.ai.priority_predictor import priority_prediction_engine
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

def execute_report_ai_analysis(report_id: str, db: Session = None):
    """
    Core AI background task for processing a new citizen water report:
    1. Image feature extraction / category suggestion.
    2. Duplicate report candidate detection against recent reports.
    3. Severity and priority score computation.
    4. Database persistence into ai_suggestions and duplicate_candidates.
    5. Admin notification generation.
    """
    close_db_when_done = False
    if db is None:
        db = SessionLocal()
        close_db_when_done = True

    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            logger.warning(f"Report {report_id} not found for AI analysis.")
            return

        # 1. Image Classification
        primary_image = db.query(ReportImage).filter(
            ReportImage.report_id == report_id,
            ReportImage.is_primary == True
        ).first()
        if not primary_image:
            primary_image = db.query(ReportImage).filter(ReportImage.report_id == report_id).first()

        image_suggestion = None
        if primary_image and primary_image.image_url:
            # Map url to local file path
            local_path = primary_image.image_url.lstrip("/")
            if not os.path.exists(local_path):
                # Try prepending uploads
                local_path = os.path.join("backend", primary_image.image_url.lstrip("/"))
            img_result = image_analysis_engine.analyze_image(local_path)
            
            ai_cat_sugg = AISuggestion(
                report_id=report.id,
                suggestion_type="category",
                suggested_value={
                    "category": img_result["suggested_category"],
                    "detected_features": img_result["detected_features"],
                    "model_used": img_result["model_used"]
                },
                confidence_score=img_result["confidence"],
                reasoning=img_result["explanation"],
                review_status="pending"
            )
            db.add(ai_cat_sugg)
            image_suggestion = img_result

        # 2. Priority & Severity Prediction
        has_img = primary_image is not None
        priority_result = priority_prediction_engine.predict(
            category=report.category,
            estimated_flow=report.estimated_flow or "moderate_stream",
            affected_households=report.affected_households or 1,
            has_image=has_img
        )
        ai_priority_sugg = AISuggestion(
            report_id=report.id,
            suggestion_type="priority",
            suggested_value={
                "recommended_severity": priority_result["recommended_severity"],
                "recommended_priority": priority_result["recommended_priority"],
                "urgency_score": priority_result["urgency_score"],
                "target_turnaround": priority_result["target_turnaround"],
                "factors": priority_result["factors"]
            },
            confidence_score=0.88,
            reasoning=priority_result["reasoning"],
            review_status="pending"
        )
        db.add(ai_priority_sugg)

        # 3. Duplicate Detection against other active reports
        candidate_reports = db.query(Report).filter(
            Report.id != report.id,
            Report.status.in_(["submitted", "under_review", "linked"])
        ).all()

        current_report_data = {
            "id": report.id,
            "title": report.title,
            "category": report.category,
            "description": report.description,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "created_at": report.created_at
        }

        duplicates_found = 0
        for cand in candidate_reports:
            cand_data = {
                "id": cand.id,
                "title": cand.title,
                "category": cand.category,
                "description": cand.description,
                "latitude": cand.latitude,
                "longitude": cand.longitude,
                "created_at": cand.created_at
            }
            dup_match = duplicate_detection_engine.evaluate_candidate(current_report_data, cand_data)
            if dup_match:
                duplicates_found += 1
                dup_record = DuplicateCandidate(
                    report_id=report.id,
                    potential_duplicate_report_id=cand.id,
                    similarity_score=dup_match["similarity_score"],
                    distance_meters=dup_match["distance_meters"],
                    time_diff_hours=dup_match["time_diff_hours"],
                    text_similarity=dup_match["text_similarity"],
                    category_match=dup_match["category_match"],
                    status="detected"
                )
                db.add(dup_record)

                # Also store AI duplicate suggestion
                dup_sugg = AISuggestion(
                    report_id=report.id,
                    suggestion_type="duplicate",
                    suggested_value={
                        "potential_duplicate_id": cand.id,
                        "potential_report_number": cand.report_number,
                        "similarity_score": dup_match["similarity_score"],
                        "reasons": dup_match["reasons"]
                    },
                    confidence_score=dup_match["similarity_score"],
                    reasoning=f"Potential duplicate of {cand.report_number}: " + " | ".join(dup_match["reasons"]),
                    review_status="pending"
                )
                db.add(dup_sugg)

        # 4. Notify Administrators of new incoming report
        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                title="New Water Report Received",
                message=f"Report {report.report_number} submitted at {report.address_text}. Recommended Priority: {priority_result['recommended_priority'].upper()}.",
                notification_type="status_update",
                related_entity_type="report",
                related_entity_id=report.id
            )
            db.add(notif)
            if duplicates_found > 0:
                dup_notif = Notification(
                    user_id=admin.id,
                    title="Potential Duplicate Water Report",
                    message=f"Report {report.report_number} has {duplicates_found} potential duplicate candidate(s) requiring review.",
                    notification_type="duplicate_alert",
                    related_entity_type="report",
                    related_entity_id=report.id
                )
                db.add(dup_notif)

        # 5. Audit Log
        audit = AuditLog(
            user_id=None,
            action="AI_ANALYSIS_COMPLETED",
            entity_type="report",
            entity_id=report.id,
            new_values={
                "urgency_score": priority_result["urgency_score"],
                "recommended_severity": priority_result["recommended_severity"],
                "duplicates_detected": duplicates_found,
                "has_image_analysis": image_suggestion is not None
            }
        )
        db.add(audit)
        db.commit()
        logger.info(f"AI analysis completed successfully for report {report_id}")

    except Exception as e:
        db.rollback()
        logger.exception(f"Error executing AI analysis for report {report_id}: {str(e)}")
    finally:
        if close_db_when_done:
            db.close()

# Celery task registration if celery is enabled
if celery_app:
    @celery_app.task(name="app.tasks.background.process_new_report_ai_celery")
    def process_new_report_ai_celery(report_id: str):
        execute_report_ai_analysis(report_id)

