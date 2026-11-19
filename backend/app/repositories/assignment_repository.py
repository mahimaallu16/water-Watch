"""
Assignment, Repair Update, and Evidence Data Repository.
"""
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.assignment import Assignment, RepairUpdate, RepairEvidence

class AssignmentRepository(BaseRepository[Assignment]):
    def __init__(self):
        super().__init__(Assignment)

    def get_by_incident(self, db: Session, incident_id: str) -> List[Assignment]:
        return db.query(Assignment).filter(
            Assignment.incident_id == incident_id
        ).order_by(Assignment.created_at.desc()).all()

    def get_by_worker(self, db: Session, worker_id: str, status: Optional[str] = None) -> List[Assignment]:
        q = db.query(Assignment).filter(Assignment.worker_id == worker_id)
        if status:
            q = q.filter(Assignment.status == status)
        return q.order_by(Assignment.assigned_at.desc()).all()

    def add_update(
        self,
        db: Session,
        assignment_id: str,
        incident_id: str,
        worker_id: str,
        update_type: str,
        notes: str
    ) -> RepairUpdate:
        update = RepairUpdate(
            assignment_id=assignment_id,
            incident_id=incident_id,
            worker_id=worker_id,
            update_type=update_type,
            notes=notes,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(update)
        db.flush()
        return update

    def add_evidence(
        self,
        db: Session,
        assignment_id: str,
        incident_id: str,
        worker_id: str,
        evidence_type: str,
        image_url: str,
        notes: Optional[str] = None,
        materials_used: Optional[str] = None
    ) -> RepairEvidence:
        ev = RepairEvidence(
            assignment_id=assignment_id,
            incident_id=incident_id,
            worker_id=worker_id,
            evidence_type=evidence_type,
            image_url=image_url,
            notes=notes,
            materials_used=materials_used,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(ev)
        db.flush()
        return ev

    def get_evidence_for_assignment(self, db: Session, assignment_id: str) -> List[RepairEvidence]:
        return db.query(RepairEvidence).filter(
            RepairEvidence.assignment_id == assignment_id
        ).order_by(RepairEvidence.uploaded_at.asc()).all()

assignment_repository = AssignmentRepository()

