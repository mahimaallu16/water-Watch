from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.incident import Incident, ReportIncidentLink
from app.models.report import Report
from app.models.assignment import Assignment, RepairEvidence, RepairUpdate
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.report_service import report_service
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException

class IncidentService:
    @staticmethod
    def generate_incident_number(db: Session) -> str:
        count = db.query(Incident).count() + 1
        year = datetime.now(timezone.utc).year
        return f"INC-{year}-{count:04d}"

    @staticmethod
    def create_incident(db: Session, inc_in: IncidentCreate, admin: User) -> Incident:
        inc_number = IncidentService.generate_incident_number(db)

        incident = Incident(
            incident_number=inc_number,
            title=inc_in.title,
            category=inc_in.category,
            description=inc_in.description,
            severity=inc_in.severity,
            priority=inc_in.priority,
            status="investigating",
            latitude=inc_in.latitude,
            longitude=inc_in.longitude,
            address_text=inc_in.address_text,
            zone=inc_in.zone or "Central",
            created_by=admin.id,
            target_resolution_at=inc_in.target_resolution_at
        )
        db.add(incident)
        db.flush()

        audit_service.record_status_change(
            db=db,
            entity_type="incident",
            entity_id=incident.id,
            new_status="investigating",
            previous_status=None,
            changed_by=admin.id,
            notes=f"Incident opened with severity '{incident.severity}' and priority '{incident.priority}'"
        )

        audit_service.log_action(
            db=db,
            action="CREATE_INCIDENT",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            new_values={
                "incident_number": incident.incident_number,
                "severity": incident.severity,
                "priority": incident.priority
            }
        )

        # If an initial report was selected to create this incident
        if inc_in.initial_report_id:
            IncidentService.link_report(
                db=db,
                incident_id=incident.id,
                report_id=inc_in.initial_report_id,
                admin=admin,
                notes="Initial report linked upon incident creation"
            )

        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def link_report(
        db: Session,
        incident_id: str,
        report_id: str,
        admin: User,
        notes: Optional[str] = None
    ) -> ReportIncidentLink:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundException("Incident", incident_id)

        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            raise NotFoundException("Report", report_id)

        # Check if already linked
        existing_link = db.query(ReportIncidentLink).filter(ReportIncidentLink.report_id == report_id).first()
        if existing_link:
            raise ConflictException(f"Report is already linked to incident id: {existing_link.incident_id}")

        link = ReportIncidentLink(
            incident_id=incident.id,
            report_id=report.id,
            linked_by=admin.id,
            notes=notes
        )
        db.add(link)

        # Update report status to linked
        old_report_status = report.status
        report.status = "linked"

        audit_service.record_status_change(
            db=db,
            entity_type="report",
            entity_id=report.id,
            new_status="linked",
            previous_status=old_report_status,
            changed_by=admin.id,
            notes=f"Report linked to incident {incident.incident_number} by admin"
        )

        audit_service.log_action(
            db=db,
            action="LINK_REPORT_TO_INCIDENT",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            new_values={"linked_report_id": report.id, "report_number": report.report_number}
        )

        # Notify the citizen that investigation is underway
        notification_service.create_notification(
            db=db,
            user_id=report.citizen_id,
            title="Report Linked to Active Incident",
            message=f"Your water report {report.report_number} has been verified and linked to incident {incident.incident_number}. Our maintenance team is investigating.",
            notification_type="status_update",
            related_entity_type="report",
            related_entity_id=report.id
        )

        db.commit()
        return link

    @staticmethod
    def update_incident(
        db: Session,
        incident_id: str,
        inc_update: IncidentUpdate,
        admin: User
    ) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundException("Incident", incident_id)

        old_values = {
            "status": incident.status,
            "severity": incident.severity,
            "priority": incident.priority
        }

        if inc_update.title is not None:
            incident.title = inc_update.title
        if inc_update.category is not None:
            incident.category = inc_update.category
        if inc_update.description is not None:
            incident.description = inc_update.description
        if inc_update.severity is not None:
            incident.severity = inc_update.severity
        if inc_update.priority is not None:
            incident.priority = inc_update.priority
        if inc_update.zone is not None:
            incident.zone = inc_update.zone
        if inc_update.target_resolution_at is not None:
            incident.target_resolution_at = inc_update.target_resolution_at

        # Status transition check
        if inc_update.status is not None and inc_update.status != incident.status:
            prev_status = incident.status
            incident.status = inc_update.status
            
            if inc_update.status == "resolved" and not incident.resolved_at:
                incident.resolved_at = datetime.now(timezone.utc)
            elif inc_update.status == "closed" and not incident.closed_at:
                incident.closed_at = datetime.now(timezone.utc)

            audit_service.record_status_change(
                db=db,
                entity_type="incident",
                entity_id=incident.id,
                new_status=incident.status,
                previous_status=prev_status,
                changed_by=admin.id,
                notes=f"Incident status changed to {incident.status}"
            )

        db.commit()
        db.refresh(incident)

        audit_service.log_action(
            db=db,
            action="UPDATE_INCIDENT",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            old_values=old_values,
            new_values={"status": incident.status, "severity": incident.severity, "priority": incident.priority}
        )
        return incident

    @staticmethod
    def get_incident_detail(db: Session, incident_id: str) -> dict:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundException("Incident", incident_id)

        # Linked reports
        links = db.query(ReportIncidentLink).filter(ReportIncidentLink.incident_id == incident.id).all()
        linked_reports = [report_service.get_report_by_id(db, l.report_id) for l in links]

        # Assignments
        assignments = db.query(Assignment).filter(Assignment.incident_id == incident.id).order_by(Assignment.created_at.desc()).all()
        active_assignment = assignments[0] if assignments else None
        
        active_worker_name = None
        active_worker_id = None
        if active_assignment and active_assignment.worker:
            active_worker_name = active_assignment.worker.full_name
            active_worker_id = active_assignment.worker_id

        # Format assignments list
        assign_list = []
        for a in assignments:
            assign_list.append({
                "id": a.id,
                "worker_id": a.worker_id,
                "worker_name": a.worker.full_name if a.worker else "Unknown",
                "status": a.status,
                "priority": a.priority,
                "instructions": a.instructions,
                "assigned_at": a.assigned_at,
                "accepted_at": a.accepted_at,
                "completed_at": a.completed_at
            })

        # Repair Evidence
        evidence = db.query(RepairEvidence).filter(RepairEvidence.incident_id == incident.id).order_by(RepairEvidence.uploaded_at.asc()).all()
        evidence_list = []
        for e in evidence:
            evidence_list.append({
                "id": e.id,
                "evidence_type": e.evidence_type,
                "image_url": e.image_url,
                "notes": e.notes,
                "materials_used": e.materials_used,
                "worker_name": e.worker.full_name if e.worker else "Worker",
                "uploaded_at": e.uploaded_at
            })

        # Status History
        status_history = audit_service.get_status_history(db, "incident", incident.id)

        return {
            "id": incident.id,
            "incident_number": incident.incident_number,
            "title": incident.title,
            "category": incident.category,
            "description": incident.description,
            "severity": incident.severity,
            "priority": incident.priority,
            "status": incident.status,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "address_text": incident.address_text,
            "zone": incident.zone,
            "created_by": incident.created_by,
            "target_resolution_at": incident.target_resolution_at,
            "resolved_at": incident.resolved_at,
            "closed_at": incident.closed_at,
            "created_at": incident.created_at,
            "updated_at": incident.updated_at,
            "linked_reports_count": len(linked_reports),
            "active_worker_name": active_worker_name,
            "active_worker_id": active_worker_id,
            "linked_reports": linked_reports,
            "assignments": assign_list,
            "evidence": evidence_list,
            "status_history": status_history
        }

    @staticmethod
    def list_incidents(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        priority: Optional[str] = None,
        zone: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[dict], int]:
        q = db.query(Incident)
        if status:
            q = q.filter(Incident.status == status)
        if severity:
            q = q.filter(Incident.severity == severity)
        if priority:
            q = q.filter(Incident.priority == priority)
        if zone:
            q = q.filter(Incident.zone == zone)

        total = q.count()
        incidents = q.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()

        results = []
        for inc in incidents:
            results.append(IncidentService.get_incident_detail(db, inc.id))
        return results, total

incident_service = IncidentService()

