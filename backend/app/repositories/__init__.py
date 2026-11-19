"""WaterWatch Data Repositories Package"""
from app.repositories.user_repository import user_repository
from app.repositories.report_repository import report_repository
from app.repositories.incident_repository import incident_repository
from app.repositories.assignment_repository import assignment_repository
from app.repositories.notification_repository import notification_repository
from app.repositories.audit_repository import audit_repository

__all__ = [
    "user_repository",
    "report_repository",
    "incident_repository",
    "assignment_repository",
    "notification_repository",
    "audit_repository",
]

