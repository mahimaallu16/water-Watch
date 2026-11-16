from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.models.assignment import Assignment, RepairUpdate, RepairEvidence
from app.models.incident import Incident, ReportIncidentLink
from app.models.report import Report
from app.models.user import User, WorkerProfile
from app.schemas.assignment import AssignmentCreate, VerificationRequest
from app.services.image_service import validate_and_save_image
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

class AssignmentService:
    @staticmethod
    def assign_worker(db: Session, assign_in: AssignmentCreate, admin: User) -> Assignment:
        incident = db.query(Incident).filter(Incident.id == assign_in.incident_id).first()
        if not incident:
            raise NotFoundException("Incident", assign_in.incident_id)

        worker = db.query(User).filter(User.id == assign_in.worker_id, User.role == "worker").first()
        if not worker:
            raise NotFoundException("Worker", assign_in.worker_id)

        # Create Assignment record
        assignment = Assignment(
            incident_id=incident.id,
            worker_id=worker.id,
            assigned_by=admin.id,
            status="assigned",
            instructions=assign_in.instructions,
            priority=assign_in.priority or incident.priority,
            assigned_at=datetime.now(timezone.utc)
        )
        db.add(assignment)

        # Transition Incident status
        prev_status = incident.status
        incident.status = "assigned"

        audit_service.record_status_change(
            db=db,
            entity_type="incident",
            entity_id=incident.id,
            new_status="assigned",
            previous_status=prev_status,
            changed_by=admin.id,
            notes=f"Assigned to {worker.full_name} by admin"
        )

        audit_service.record_status_change(
            db=db,
            entity_type="assignment",
            entity_id=assignment.id,
            new_status="assigned",
            previous_status=None,
            changed_by=admin.id,
            notes=f"New assignment created for incident {incident.incident_number}"
        )

        audit_service.log_action(
            db=db,
            action="ASSIGN_WORKER",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            new_values={
                "worker_id": worker.id,
                "worker_name": worker.full_name,
                "incident_number": incident.incident_number
            }
        )

        # Notify field worker
        notification_service.create_notification(
            db=db,
            user_id=worker.id,
            title="New Incident Assignment",
            message=f"You have been assigned to incident {incident.incident_number} at {incident.address_text}. Priority: {assignment.priority.upper()}.",
            notification_type="assignment",
            related_entity_type="incident",
            related_entity_id=incident.id
        )

        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def accept_assignment(db: Session, assignment_id: str, worker: User) -> Assignment:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("You can only accept your own assignments")

        assignment.status = "accepted"
        assignment.accepted_at = datetime.now(timezone.utc)

        # Update Incident status to in_progress
        incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()
        if incident:
            prev_status = incident.status
            incident.status = "in_progress"
            audit_service.record_status_change(
                db=db,
                entity_type="incident",
                entity_id=incident.id,
                new_status="in_progress",
                previous_status=prev_status,
                changed_by=worker.id,
                notes=f"Worker {worker.full_name} accepted assignment and began mobilization"
            )

        audit_service.record_status_change(
            db=db,
            entity_type="assignment",
            entity_id=assignment.id,
            new_status="accepted",
            previous_status="assigned",
            changed_by=worker.id,
            notes="Assignment accepted by worker"
        )

        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def add_repair_update(
        db: Session,
        assignment_id: str,
        update_type: str,
        notes: str,
        worker: User
    ) -> RepairUpdate:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("Unauthorized")

        update = RepairUpdate(
            assignment_id=assignment.id,
            incident_id=assignment.incident_id,
            worker_id=worker.id,
            update_type=update_type,
            notes=notes,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(update)
        db.commit()
        db.refresh(update)
        return update

    @staticmethod
    def upload_evidence(
        db: Session,
        assignment_id: str,
        evidence_type: str,
        image_file: UploadFile,
        notes: Optional[str],
        materials_used: Optional[str],
        worker: User
    ) -> RepairEvidence:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("Unauthorized")

        rel_url, size, w, h = validate_and_save_image(image_file, subfolder="evidence")

        evidence = RepairEvidence(
            assignment_id=assignment.id,
            incident_id=assignment.incident_id,
            worker_id=worker.id,
            evidence_type=evidence_type,
            image_url=rel_url,
            notes=notes,
            materials_used=materials_used,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence

    @staticmethod
    def submit_completion(
        db: Session,
        assignment_id: str,
        notes: Optional[str],
        worker: User
    ) -> Assignment:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("Unauthorized")

        # Verify that at least one evidence photograph has been uploaded
        evidence_count = db.query(RepairEvidence).filter(RepairEvidence.assignment_id == assignment.id).count()
        if evidence_count == 0:
            raise BadRequestException("You must upload at least one repair evidence photograph before submitting work for verification")

        assignment.status = "completed"
        assignment.completed_at = datetime.now(timezone.utc)

        # Transition Incident to work_submitted
        incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()
        if incident:
            prev_status = incident.status
            incident.status = "work_submitted"
            audit_service.record_status_change(
                db=db,
                entity_type="incident",
                entity_id=incident.id,
                new_status="work_submitted",
                previous_status=prev_status,
                changed_by=worker.id,
                notes=f"Repair completed by {worker.full_name}. Awaiting administrator verification. Notes: {notes or 'None'}"
            )

        audit_service.record_status_change(
            db=db,
            entity_type="assignment",
            entity_id=assignment.id,
            new_status="completed",
            previous_status="in_progress",
            changed_by=worker.id,
            notes="Work submitted for verification"
        )

        # Notify administrator(s)
        admins = db.query(User).filter(User.role == "admin", User.is_active == True).all()
        for adm in admins:
            notification_service.create_notification(
                db=db,
                user_id=adm.id,
                title="Repair Evidence Ready for Verification",
                message=f"Worker {worker.full_name} has submitted repair evidence for incident {incident.incident_number if incident else ''}. Please review and verify.",
                notification_type="verification_result",
                related_entity_type="incident",
                related_entity_id=incident.id if incident else None
            )

        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def verify_resolution(
        db: Session,
        incident_id: str,
        verification: VerificationRequest,
        admin: User
    ) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundException("Incident", incident_id)

        active_assignment = db.query(Assignment).filter(
            Assignment.incident_id == incident.id
        ).order_by(Assignment.created_at.desc()).first()

        prev_status = incident.status

        if verification.approved:
            # Mark incident resolved
            incident.status = "resolved"
            incident.resolved_at = datetime.now(timezone.utc)

            # Update all linked reports to resolved
            links = db.query(ReportIncidentLink).filter(ReportIncidentLink.incident_id == incident.id).all()
            for l in links:
                rep = db.query(Report).filter(Report.id == l.report_id).first()
                if rep and rep.status != "resolved":
                    prev_rep_status = rep.status
                    rep.status = "resolved"
                    audit_service.record_status_change(
                        db=db,
                        entity_type="report",
                        entity_id=rep.id,
                        new_status="resolved",
                        previous_status=prev_rep_status,
                        changed_by=admin.id,
                        notes=f"Resolved via verified incident {incident.incident_number}"
                    )
                    # Notify citizen
                    notification_service.create_notification(
                        db=db,
                        user_id=rep.citizen_id,
                        title="Water Problem Resolved!",
                        message=f"Good news! The repair for your report {rep.report_number} has been inspected, verified, and successfully resolved.",
                        notification_type="status_update",
                        related_entity_type="report",
                        related_entity_id=rep.id
                    )

            audit_service.record_status_change(
                db=db,
                entity_type="incident",
                entity_id=incident.id,
                new_status="resolved",
                previous_status=prev_status,
                changed_by=admin.id,
                notes=f"Repair approved and verified by admin. Notes: {verification.feedback_notes or 'All evidence verified'}"
            )

            # Notify worker
            if active_assignment:
                notification_service.create_notification(
                    db=db,
                    user_id=active_assignment.worker_id,
                    title="Repair Approved & Verified",
                    message=f"Your repair for incident {incident.incident_number} was approved by administration. Great job!",
                    notification_type="verification_result",
                    related_entity_type="incident",
                    related_entity_id=incident.id
                )

        else:
            # Rejection / rework required
            incident.status = "in_progress"
            if active_assignment:
                active_assignment.status = "rework_required"
                audit_service.record_status_change(
                    db=db,
                    entity_type="assignment",
                    entity_id=active_assignment.id,
                    new_status="rework_required",
                    previous_status="completed",
                    changed_by=admin.id,
                    notes=f"Resolution rejected. Rework requested: {verification.feedback_notes}"
                )
                # Notify worker
                notification_service.create_notification(
                    db=db,
                    user_id=active_assignment.worker_id,
                    title="Repair Verification Feedback (Rework Required)",
                    message=f"Admin requested rework on incident {incident.incident_number}: {verification.feedback_notes}",
                    notification_type="verification_result",
                    related_entity_type="incident",
                    related_entity_id=incident.id
                )

            audit_service.record_status_change(
                db=db,
                entity_type="incident",
                entity_id=incident.id,
                new_status="in_progress",
                previous_status=prev_status,
                changed_by=admin.id,
                notes=f"Repair rejected. Returned to worker: {verification.feedback_notes}"
            )

        audit_service.log_action(
            db=db,
            action="VERIFY_RESOLUTION" if verification.approved else "REJECT_RESOLUTION",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            new_values={
                "approved": verification.approved,
                "feedback": verification.feedback_notes,
                "incident_status": incident.status
            }
        )

        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def get_worker_assignments(db: Session, worker_id: str, status: Optional[str] = None) -> List[dict]:
        q = db.query(Assignment).filter(Assignment.worker_id == worker_id)
        if status:
            q = q.filter(Assignment.status == status)
        assignments = q.order_by(Assignment.assigned_at.desc()).all()

        results = []
        for a in assignments:
            inc = db.query(Incident).filter(Incident.id == a.incident_id).first()
            updates = db.query(RepairUpdate).filter(RepairUpdate.assignment_id == a.id).order_by(RepairUpdate.timestamp.asc()).all()
            evidence = db.query(RepairEvidence).filter(RepairEvidence.assignment_id == a.id).order_by(RepairEvidence.uploaded_at.asc()).all()

            results.append({
                "id": a.id,
                "incident_id": a.incident_id,
                "incident_number": inc.incident_number if inc else None,
                "incident_title": inc.title if inc else None,
                "incident_category": inc.category if inc else None,
                "incident_severity": inc.severity if inc else None,
                "incident_priority": inc.priority if inc else None,
                "incident_status": inc.status if inc else None,
                "incident_latitude": inc.latitude if inc else None,
                "incident_longitude": inc.longitude if inc else None,
                "incident_address": inc.address_text if inc else None,
                "worker_id": a.worker_id,
                "worker_name": a.worker.full_name if a.worker else "Worker",
                "assigned_by": a.assigned_by,
                "assigner_name": a.assigner.full_name if a.assigner else "Admin",
                "status": a.status,
                "instructions": a.instructions,
                "priority": a.priority,
                "assigned_at": a.assigned_at,
                "accepted_at": a.accepted_at,
                "completed_at": a.completed_at,
                "updates": [{
                    "id": u.id,
                    "assignment_id": u.assignment_id,
                    "incident_id": u.incident_id,
                    "worker_id": u.worker_id,
                    "worker_name": a.worker.full_name if a.worker else "",
                    "update_type": u.update_type,
                    "notes": u.notes,
                    "timestamp": u.timestamp
                } for u in updates],
                "evidence": [{
                    "id": e.id,
                    "assignment_id": e.assignment_id,
                    "incident_id": e.incident_id,
                    "worker_id": e.worker_id,
                    "worker_name": a.worker.full_name if a.worker else "",
                    "evidence_type": e.evidence_type,
                    "image_url": e.image_url,
                    "notes": e.notes,
                    "materials_used": e.materials_used,
                    "uploaded_at": e.uploaded_at
                } for e in evidence]
            })
        return results

assignment_service = AssignmentService()

