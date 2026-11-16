"""
Status State Machine and Transition Validators for WaterWatch.

Enforces valid status transitions across Reports, Incidents, and Assignments:
REPORTED -> UNDER_REVIEW -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> REPAIR_SUBMITTED -> VERIFICATION_PENDING -> RESOLVED
"""
from enum import Enum
from typing import Dict, Set
from app.core.exceptions import BadRequestException

class IncidentStatus(str, Enum):
    INVESTIGATING = "investigating"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WORK_SUBMITTED = "work_submitted"
    VERIFICATION_PENDING = "verification_pending"
    RESOLVED = "resolved"
    CLOSED = "closed"

class ReportStatus(str, Enum):
    SUBMITTED = "submitted"
    REPORTED = "reported"
    UNDER_REVIEW = "under_review"
    LINKED = "linked"
    VERIFIED = "verified"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class AssignmentStatus(str, Enum):
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REWORK_REQUIRED = "rework_required"

# Allowed forward and rollback transitions for Incidents
ALLOWED_INCIDENT_TRANSITIONS: Dict[str, Set[str]] = {
    "investigating": {"assigned", "in_progress", "resolved", "closed", "under_review"},
    "under_review": {"investigating", "assigned", "resolved", "closed"},
    "assigned": {"in_progress", "assigned", "investigating", "closed"},
    "in_progress": {"work_submitted", "verification_pending", "assigned", "closed"},
    "work_submitted": {"resolved", "in_progress", "rework_required", "verification_pending", "closed"},
    "verification_pending": {"resolved", "in_progress", "rework_required", "closed"},
    "resolved": {"closed", "in_progress"},
    "closed": set()
}

# Allowed transitions for Citizen Reports
ALLOWED_REPORT_TRANSITIONS: Dict[str, Set[str]] = {
    "submitted": {"under_review", "linked", "verified", "rejected", "resolved"},
    "reported": {"under_review", "linked", "verified", "rejected", "resolved"},
    "under_review": {"linked", "verified", "rejected", "resolved", "submitted"},
    "linked": {"resolved", "rejected", "under_review"},
    "verified": {"linked", "resolved", "rejected"},
    "resolved": set(),
    "rejected": {"submitted", "under_review"}
}

# Allowed transitions for Assignments
ALLOWED_ASSIGNMENT_TRANSITIONS: Dict[str, Set[str]] = {
    "assigned": {"accepted", "in_progress"},
    "accepted": {"in_progress", "completed"},
    "in_progress": {"completed", "rework_required"},
    "completed": {"rework_required"},
    "rework_required": {"in_progress", "completed"}
}

def normalize_status(status_str: str) -> str:
    """Normalizes uppercase or alias status strings to standard lowercase form."""
    if not status_str:
        return ""
    s = status_str.strip().lower()
    mapping = {
        "reported": "submitted",
        "verified": "linked",
        "repair_submitted": "work_submitted",
        "verification_pending": "work_submitted"
    }
    return mapping.get(s, s)

def validate_incident_transition(current_status: str, new_status: str) -> str:
    """Validates that transitioning an incident from current_status to new_status is permitted."""
    c = normalize_status(current_status)
    n = normalize_status(new_status)
    
    if c == n:
        return n
        
    allowed = ALLOWED_INCIDENT_TRANSITIONS.get(c, set())
    if n not in allowed:
        raise BadRequestException(
            f"Invalid incident status transition from '{current_status}' to '{new_status}'. "
            f"Allowed next states: {', '.join(sorted(allowed)) if allowed else 'None (Terminal state)'}"
        )
    return n

def validate_report_transition(current_status: str, new_status: str) -> str:
    """Validates that transitioning a report from current_status to new_status is permitted."""
    c = normalize_status(current_status)
    n = normalize_status(new_status)
    
    if c == n:
        return n
        
    allowed = ALLOWED_REPORT_TRANSITIONS.get(c, set())
    if n not in allowed:
        raise BadRequestException(
            f"Invalid report status transition from '{current_status}' to '{new_status}'. "
            f"Allowed next states: {', '.join(sorted(allowed)) if allowed else 'None'}"
        )
    return n

