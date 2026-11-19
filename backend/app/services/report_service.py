import os
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import UploadFile, BackgroundTasks
from app.models.report import Report, ReportImage, DuplicateCandidate
from app.models.incident import ReportIncidentLink, Incident
from app.models.user import User
from app.schemas.report import ReportCreate, ReportOut, ReportImageOut, DuplicateCandidateOut
from app.services.image_service import validate_and_save_image
from app.services.audit_service import audit_service
from app.tasks.background import execute_report_ai_analysis
from app.ai.duplicate_detector import calculate_haversine_distance_meters
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException

class ReportService:
    @staticmethod
    def generate_report_number(db: Session) -> str:
        count = db.query(Report).count() + 1
        year = datetime.now(timezone.utc).year
        return f"REP-{year}-{count:04d}"

    @staticmethod
    def create_report(
        db: Session,
        report_in: ReportCreate,
        citizen: User,
        images: List[UploadFile] = None,
        background_tasks: BackgroundTasks = None
    ) -> Report:
        report_number = ReportService.generate_report_number(db)

        report = Report(
            citizen_id=citizen.id,
            report_number=report_number,
            title=report_in.title,
            category=report_in.category,
            description=report_in.description,
            estimated_flow=report_in.estimated_flow or "moderate_stream",
            affected_households=report_in.affected_households or 1,
            latitude=report_in.latitude,
            longitude=report_in.longitude,
            address_text=report_in.address_text,
            landmark=report_in.landmark,
            status="submitted"
        )
        db.add(report)
        db.flush()

        # Handle uploaded photographs
        if images:
            for idx, img_file in enumerate(images):
                if img_file.filename:
                    rel_url, size, w, h = validate_and_save_image(img_file, subfolder="reports")
                    img_record = ReportImage(
                        report_id=report.id,
                        image_url=rel_url,
                        file_name=img_file.filename,
                        file_size=size,
                        mime_type=img_file.content_type,
                        width=w,
                        height=h,
                        is_primary=(idx == 0)
                    )
                    db.add(img_record)

        db.commit()
        db.refresh(report)

        # Audit and status history
        audit_service.record_status_change(
            db=db,
            entity_type="report",
            entity_id=report.id,
            new_status="submitted",
            previous_status=None,
            changed_by=citizen.id,
            notes="Report initially submitted by resident"
        )
        audit_service.log_action(
            db=db,
            action="CREATE_REPORT",
            entity_type="report",
            entity_id=report.id,
            user_id=citizen.id,
            new_values={"report_number": report.report_number, "category": report.category}
        )

        # Trigger AI analysis (Background or immediate execution)
        if background_tasks:
            background_tasks.add_task(execute_report_ai_analysis, report.id)
        else:
            execute_report_ai_analysis(report.id, db=db)

        return report

    @staticmethod
    def get_report_by_id(db: Session, report_id: str) -> dict:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise NotFoundException("Report", report_id)

        citizen = db.query(User).filter(User.id == report.citizen_id).first()
        link = db.query(ReportIncidentLink).filter(ReportIncidentLink.report_id == report.id).first()
        
        linked_inc = None
        if link:
            inc = db.query(Incident).filter(Incident.id == link.incident_id).first()
            if inc:
                linked_inc = inc

        images_out = [
            ReportImageOut.model_validate(img) for img in report.images
        ]

        feedback_out = None
        if report.feedback:
            feedback_out = {
                "id": report.feedback.id,
                "rating": report.feedback.rating,
                "satisfaction_category": report.feedback.satisfaction_category,
                "comments": report.feedback.comments,
                "created_at": report.feedback.created_at,
                "updated_at": report.feedback.updated_at
            }

        return {
            "id": report.id,
            "citizen_id": report.citizen_id,
            "report_number": report.report_number,
            "title": report.title,
            "category": report.category,
            "description": report.description,
            "estimated_flow": report.estimated_flow,
            "affected_households": report.affected_households,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "address_text": report.address_text,
            "landmark": report.landmark,
            "status": report.status,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "images": images_out,
            "citizen_name": citizen.full_name if citizen else "Resident",
            "linked_incident_id": linked_inc.id if linked_inc else None,
            "linked_incident_number": linked_inc.incident_number if linked_inc else None,
            "linked_incident_status": linked_inc.status if linked_inc else None,
            "feedback": feedback_out
        }

    @staticmethod
    def list_reports(
        db: Session,
        citizen_id: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[dict], int]:
        q = db.query(Report)
        if citizen_id:
            q = q.filter(Report.citizen_id == citizen_id)
        if status:
            q = q.filter(Report.status == status)
        if category:
            q = q.filter(Report.category == category)
            
        total = q.count()
        reports = q.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

        results = []
        for r in reports:
            results.append(ReportService.get_report_by_id(db, r.id))
        return results, total

    @staticmethod
    def get_nearby_reports(
        db: Session,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0
    ) -> List[dict]:
        reports = db.query(Report).filter(
            Report.status.in_(["submitted", "under_review", "linked", "resolved"])
        ).all()

        nearby = []
        for r in reports:
            dist_m = calculate_haversine_distance_meters(latitude, longitude, r.latitude, r.longitude)
            if (dist_m / 1000.0) <= radius_km:
                rep_data = ReportService.get_report_by_id(db, r.id)
                rep_data["distance_km"] = round(dist_m / 1000.0, 2)
                nearby.append(rep_data)

        # Sort by distance
        nearby.sort(key=lambda x: x["distance_km"])
        return nearby

    @staticmethod
    def add_additional_evidence(
        db: Session,
        report_id: str,
        user: User,
        images: List[UploadFile] = None,
        notes: Optional[str] = None
    ) -> Report:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise NotFoundException("Report", report_id)

        # Must be report owner or admin
        if user.role != "admin" and report.citizen_id != user.id:
            raise ForbiddenException("You cannot modify evidence for this report")

        if images:
            for img_file in images:
                if img_file.filename:
                    rel_url, size, w, h = validate_and_save_image(img_file, subfolder="reports")
                    img_record = ReportImage(
                        report_id=report.id,
                        image_url=rel_url,
                        file_name=img_file.filename,
                        file_size=size,
                        mime_type=img_file.content_type,
                        width=w,
                        height=h,
                        is_primary=False
                    )
                    db.add(img_record)

        if notes:
            report.description += f"\n\n[Additional Note ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}]: {notes}"

        db.commit()
        db.refresh(report)

        audit_service.log_action(
            db=db,
            action="ADD_REPORT_EVIDENCE",
            entity_type="report",
            entity_id=report.id,
            user_id=user.id,
            new_values={"notes_appended": bool(notes), "images_added": len(images) if images else 0}
        )
        return report

report_service = ReportService()

