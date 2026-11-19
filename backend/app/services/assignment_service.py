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
from app.utils.status import validate_incident_transition
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.repositories.assignment_repository import assignment_repository
from app.repositories.incident_repository import incident_repository
from app.repositories.user_repository import user_repository

class AssignmentService:
    @staticmethod
    def assign_worker(db: Session, assign_in: AssignmentCreate, admin: User) -> Assignment:
        incident = incident_repository.get(db, assign_in.incident_id)
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

        # Transition Incident status to assigned
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
    def reassign_worker(
        db: Session,
        incident_id: str,
        new_worker_id: str,
        admin: User,
        instructions: Optional[str] = None
    ) -> Assignment:
        """
        Reassigns an incident to a new worker.
        Records reassignment in assignment history and audit logs.
        """
        incident = incident_repository.get(db, incident_id)
        if not incident:
            raise NotFoundException("Incident", incident_id)

        new_worker = db.query(User).filter(User.id == new_worker_id, User.role == "worker").first()
        if not new_worker:
            raise NotFoundException("Worker", new_worker_id)

        # Close/supersede current active assignment if one exists
        current_active = db.query(Assignment).filter(
            Assignment.incident_id == incident.id,
            Assignment.status.in_(["assigned", "accepted", "in_progress", "rework_required"])
        ).order_by(Assignment.created_at.desc()).first()

        old_worker_id = None
        if current_active:
            old_worker_id = current_active.worker_id
            current_active.status = "reassigned"
            db.flush()

        # Create new assignment
        new_assignment = Assignment(
            incident_id=incident.id,
            worker_id=new_worker.id,
            assigned_by=admin.id,
            status="assigned",
            instructions=instructions or f"Reassigned from previous technician",
            priority=incident.priority,
            assigned_at=datetime.now(timezone.utc)
        )
        db.add(new_assignment)
        incident.status = "assigned"

        audit_service.record_status_change(
            db=db,
            entity_type="incident",
            entity_id=incident.id,
            new_status="assigned",
            previous_status=incident.status,
            changed_by=admin.id,
            notes=f"Reassigned to {new_worker.full_name} (previously: {old_worker_id})"
        )

        audit_service.log_action(
            db=db,
            action="REASSIGN_WORKER",
            entity_type="incident",
            entity_id=incident.id,
            user_id=admin.id,
            new_values={
                "previous_worker_id": old_worker_id,
                "new_worker_id": new_worker.id,
                "incident_number": incident.incident_number
            }
        )

        # Notify new worker
        notification_service.create_notification(
            db=db,
            user_id=new_worker.id,
            title="Reassigned Incident Work Order",
            message=f"Incident {incident.incident_number} at {incident.address_text} has been assigned to you.",
            notification_type="assignment",
            related_entity_type="incident",
            related_entity_id=incident.id
        )

        db.commit()
        db.refresh(new_assignment)
        return new_assignment

    @staticmethod
    def get_assignment_detail(db: Session, assignment_id: str, current_user: User) -> dict:
        assignment = assignment_repository.get(db, assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        # Server-side ownership check:
        # A worker can only access assignments authorized for that worker
        if current_user.role == "worker" and assignment.worker_id != current_user.id:
            raise ForbiddenException("You are not authorized to view another worker's assignment")

        inc = incident_repository.get(db, assignment.incident_id)
        updates = db.query(RepairUpdate).filter(RepairUpdate.assignment_id == assignment.id).order_by(RepairUpdate.timestamp.asc()).all()
        evidence = db.query(RepairEvidence).filter(RepairEvidence.assignment_id == assignment.id).order_by(RepairEvidence.uploaded_at.asc()).all()

        return {
            "id": assignment.id,
            "incident_id": assignment.incident_id,
            "incident_number": inc.incident_number if inc else None,
            "incident_title": inc.title if inc else None,
            "incident_category": inc.category if inc else None,
            "incident_severity": inc.severity if inc else None,
            "incident_priority": inc.priority if inc else None,
            "incident_status": inc.status if inc else None,
            "incident_latitude": inc.latitude if inc else None,
            "incident_longitude": inc.longitude if inc else None,
            "incident_address": inc.address_text if inc else None,
            "worker_id": assignment.worker_id,
            "worker_name": assignment.worker.full_name if assignment.worker else "Worker",
            "assigned_by": assignment.assigned_by,
            "status": assignment.status,
            "instructions": assignment.instructions,
            "priority": assignment.priority,
            "assigned_at": assignment.assigned_at,
            "accepted_at": assignment.accepted_at,
            "completed_at": assignment.completed_at,
            "updates": [{
                "id": u.id,
                "update_type": u.update_type,
                "notes": u.notes,
                "timestamp": u.timestamp
            } for u in updates],
            "evidence": [{
                "id": e.id,
                "evidence_type": e.evidence_type,
                "image_url": e.image_url,
                "notes": e.notes,
                "materials_used": e.materials_used,
                "uploaded_at": e.uploaded_at
            } for e in evidence]
        }

    @staticmethod
    def accept_assignment(db: Session, assignment_id: str, worker: User) -> Assignment:
        assignment = assignment_repository.get(db, assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        # Worker ownership check
        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("You can only accept your own assignments")

        assignment.status = "accepted"
        assignment.accepted_at = datetime.now(timezone.utc)

        # Update Incident status to in_progress
        incident = incident_repository.get(db, assignment.incident_id)
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
        assignment = assignment_repository.get(db, assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        # Worker ownership check
        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("You cannot post updates to another worker's task")

        update = assignment_repository.add_update(
            db=db,
            assignment_id=assignment.id,
            incident_id=assignment.incident_id,
            worker_id=worker.id,
            update_type=update_type,
            notes=notes
        )
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
        assignment = assignment_repository.get(db, assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        # Worker ownership check
        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("You cannot upload evidence for another worker's task")

        ev_type = evidence_type.strip().lower()
        if ev_type not in ("before", "in_progress", "after"):
            raise BadRequestException(f"Invalid evidence_type '{evidence_type}'. Must be before, in_progress, or after.")

        rel_url, size, w, h = validate_and_save_image(image_file, subfolder="evidence")

        evidence = assignment_repository.add_evidence(
            db=db,
            assignment_id=assignment.id,
            incident_id=assignment.incident_id,
            worker_id=worker.id,
            evidence_type=ev_type,
            image_url=rel_url,
            notes=notes,
            materials_used=materials_used
        )
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
        assignment = assignment_repository.get(db, assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", assignment_id)

        # Worker ownership check
        if assignment.worker_id != worker.id and worker.role != "admin":
            raise ForbiddenException("You cannot submit completion for another worker's task")

        # Verify that at least one evidence photograph has been uploaded
        evidence_count = db.query(RepairEvidence).filter(RepairEvidence.assignment_id == assignment.id).count()
        if evidence_count == 0:
            raise BadRequestException("You must upload at least one repair evidence photograph before submitting work for verification")

        assignment.status = "completed"
        assignment.completed_at = datetime.now(timezone.utc)

        # Transition Incident to work_submitted
        incident = incident_repository.get(db, assignment.incident_id)
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

        # Notify administrators
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
        """
        Admin action only.
        If approved: incident becomes resolved, all linked reports become resolved, citizens and workers notified.
        If rejected: incident returns to in_progress, assignment becomes rework_required, worker notified.
        """
        incident = incident_repository.get(db, incident_id)
        if not incident:
            raise NotFoundException("Incident", incident_id)

        active_assignment = db.query(Assignment).filter(
            Assignment.incident_id == incident.id
        ).order_by(Assignment.created_at.desc()).first()

        prev_status = incident.status

        if verification.approved:
            incident.status = "resolved"
            incident.resolved_at = datetime.now(timezone.utc)

            # Update all linked reports to resolved in the same transaction
            links = incident_repository.get_linked_reports(db, incident.id)
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
        assignments = assignment_repository.get_by_worker(db, worker_id, status=status)
        results = []
        for a in assignments:
            inc = incident_repository.get(db, a.incident_id)
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

    @staticmethod
    def get_incident_assignments(db: Session, incident_id: str) -> List[dict]:
        assignments = assignment_repository.get_by_incident(db, incident_id)
        results = []
        for a in assignments:
            results.append({
                "id": a.id,
                "worker_id": a.worker_id,
                "worker_name": a.worker.full_name if a.worker else "Worker",
                "status": a.status,
                "priority": a.priority,
                "instructions": a.instructions,
                "assigned_at": a.assigned_at,
                "accepted_at": a.accepted_at,
                "completed_at": a.completed_at
            })
        return results

assignment_service = AssignmentService()
