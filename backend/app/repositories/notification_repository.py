"""
Notification Data Repository.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.notification import Notification

class NotificationRepository(BaseRepository[Notification]):
    def __init__(self):
        super().__init__(Notification)

    def get_user_notifications(self, db: Session, user_id: str, limit: int = 30) -> List[Notification]:
        return db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def get_unread_count(self, db: Session, user_id: str) -> int:
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def mark_read(self, db: Session, notification_id: str, user_id: str) -> bool:
        n = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if n:
            n.is_read = True
            db.flush()
            return True
        return False

    def mark_all_read(self, db: Session, user_id: str) -> int:
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.flush()
        return count

notification_repository = NotificationRepository()

