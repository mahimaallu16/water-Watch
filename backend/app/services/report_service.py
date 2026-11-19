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
from app.utils.geo import validate_coordinates, haversine_distance_meters
from app.utils.status import validate_report_transition
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.repositories.report_repository import report_repository

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
        # Strict validation of latitude and longitude coordinates
        lat, lon = validate_coordinates(report_in.latitude, report_in.longitude)

        report_number = ReportService.generate_report_number(db)

        report = Report(
            citizen_id=citizen.id,
            report_number=report_number,
            title=report_in.title.strip(),
            category=report_in.category.strip().lower(),
            description=report_in.description.strip(),
            estimated_flow=report_in.estimated_flow or "moderate_stream",
            affected_households=max(1, report_in.affected_households or 1),
            latitude=lat,
            longitude=lon,
            address_text=report_in.address_text.strip(),
            landmark=report_in.landmark.strip() if report_in.landmark else None,
            status="submitted"
        )
        db.add(report)
        db.flush()

        # Handle uploaded photographs
        if images:
            for idx, img_file in enumerate(images):
                if img_file and img_file.filename:
                    rel_url, size, w, h = validate_and_save_image(img_file, subfolder="reports")
                    report_repository.add_image(
                        db=db,
                        report_id=report.id,
                        image_url=rel_url,
                        file_name=img_file.filename,
                        file_size=size,
                        mime_type=img_file.content_type,
                        width=w,
                        height=h,
                        is_primary=(idx == 0)
                    )

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
    def get_report_by_id(db: Session, report_id: str, current_user: Optional[User] = None) -> dict:
        report = report_repository.get(db, report_id)
        if not report:
            raise NotFoundException("Report", report_id)

        # Server-side ownership enforcement:
        # A resident can only access their own reports
        if current_user and current_user.role in ("citizen", "resident"):
            if report.citizen_id != current_user.id:
                raise ForbiddenException("Residents can only access their own reports")

        citizen = db.query(User).filter(User.id == report.citizen_id).first()
        link = report_repository.get_incident_link(db, report.id)
        
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
        reports, total = report_repository.filter_reports(
            db=db,
            citizen_id=citizen_id,
            status=status,
            category=category,
            skip=skip,
            limit=limit
        )

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
        validate_coordinates(latitude, longitude)
        reports = db.query(Report).filter(
            Report.status.in_(["submitted", "under_review", "linked", "resolved"])
        ).all()

        nearby = []
        for r in reports:
            dist_m = haversine_distance_meters(latitude, longitude, r.latitude, r.longitude)
            if (dist_m / 1000.0) <= radius_km:
                rep_data = ReportService.get_report_by_id(db, r.id)
                rep_data["distance_km"] = round(dist_m / 1000.0, 2)
                nearby.append(rep_data)

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
        report = report_repository.get(db, report_id)
        if not report:
            raise NotFoundException("Report", report_id)

        # Server-side ownership enforcement:
        # Resident can only submit evidence to their own reports
        if user.role in ("citizen", "resident") and report.citizen_id != user.id:
            raise ForbiddenException("You cannot add evidence to another resident's report")

        if images:
            for img_file in images:
                if img_file and img_file.filename:
                    rel_url, size, w, h = validate_and_save_image(img_file, subfolder="reports")
                    report_repository.add_image(
                        db=db,
                        report_id=report.id,
                        image_url=rel_url,
                        file_name=img_file.filename,
                        file_size=size,
                        mime_type=img_file.content_type,
                        width=w,
                        height=h,
                        is_primary=False
                    )

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

    @staticmethod
    def get_report_status_history(db: Session, report_id: str, current_user: User) -> List[dict]:
        report = report_repository.get(db, report_id)
        if not report:
            raise NotFoundException("Report", report_id)

        # Ownership check
        if current_user.role in ("citizen", "resident") and report.citizen_id != current_user.id:
            raise ForbiddenException("Residents can only access history of their own reports")

        return audit_service.get_status_history(db, "report", report.id)

report_service = ReportService()
