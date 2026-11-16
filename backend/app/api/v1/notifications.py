from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.notification import NotificationOut
from app.services.notification_service import notification_service
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationOut])
def get_my_notifications(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve in-app notifications for the current authenticated user."""
    return notification_service.get_user_notifications(db, current_user.id, limit=limit)

@router.get("/unread-count", response_model=dict)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of unread notifications for the user."""
    count = notification_service.get_unread_count(db, current_user.id)
    return {"unread_count": count}

@router.patch("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read."""
    success = notification_service.mark_as_read(db, notification_id, current_user.id)
    return {"success": success}

@router.post("/read-all", response_model=dict)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all unread notifications as read."""
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {"marked_read": count}

