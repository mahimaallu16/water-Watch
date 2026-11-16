from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog, StatusHistory
from app.models.user import User

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def record_status_change(
        db: Session,
        entity_type: str,
        entity_id: str,
        new_status: str,
        previous_status: Optional[str] = None,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None
    ) -> StatusHistory:
        hist = StatusHistory(
            entity_type=entity_type,
            entity_id=str(entity_id),
            previous_status=previous_status,
            new_status=new_status,
            changed_by=changed_by,
            notes=notes
        )
        db.add(hist)
        db.commit()
        db.refresh(hist)
        return hist

    @staticmethod
    def get_status_history(db: Session, entity_type: str, entity_id: str) -> List[dict]:
        records = db.query(StatusHistory).filter(
            StatusHistory.entity_type == entity_type,
            StatusHistory.entity_id == str(entity_id)
        ).order_by(StatusHistory.created_at.asc()).all()
        
        result = []
        for r in records:
            actor_name = r.actor.full_name if r.actor else "System"
            result.append({
                "id": r.id,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "previous_status": r.previous_status,
                "new_status": r.new_status,
                "changed_by": r.changed_by,
                "actor_name": actor_name,
                "notes": r.notes,
                "created_at": r.created_at
            })
        return result

    @staticmethod
    def get_audit_logs(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        action: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> List[dict]:
        q = db.query(AuditLog)
        if action:
            q = q.filter(AuditLog.action == action)
        if entity_type:
            q = q.filter(AuditLog.entity_type == entity_type)
        logs = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
        
        results = []
        for l in logs:
            user_name = l.user.full_name if l.user else "System AI"
            user_role = l.user.role if l.user else "system"
            results.append({
                "id": l.id,
                "user_id": l.user_id,
                "user_name": user_name,
                "user_role": user_role,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "old_values": l.old_values,
                "new_values": l.new_values,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "created_at": l.created_at
            })
        return results

audit_service = AuditService()

