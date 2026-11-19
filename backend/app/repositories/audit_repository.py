"""
Status History and Audit Log Data Repository.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.audit import AuditLog, StatusHistory

class AuditRepository:
    def record_status_change(
        self,
        db: Session,
        entity_type: str,
        entity_id: str,
        new_status: str,
        previous_status: Optional[str] = None,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None
    ) -> StatusHistory:
        rec = StatusHistory(
            entity_type=entity_type,
            entity_id=entity_id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=changed_by,
            notes=notes,
            created_at=datetime.now(timezone.utc)
        )
        db.add(rec)
        db.flush()
        return rec

    def log_action(
        self,
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
        db.flush()
        return log

    def get_status_history(self, db: Session, entity_type: str, entity_id: str) -> List[StatusHistory]:
        return db.query(StatusHistory).filter(
            StatusHistory.entity_type == entity_type,
            StatusHistory.entity_id == entity_id
        ).order_by(StatusHistory.created_at.asc()).all()

    def get_audit_logs(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        action: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> List[AuditLog]:
        q = db.query(AuditLog)
        if action:
            q = q.filter(AuditLog.action == action)
        if entity_type:
            q = q.filter(AuditLog.entity_type == entity_type)
        return q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

audit_repository = AuditRepository()

