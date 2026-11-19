from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentOut, IncidentDetailOut, ReportIncidentLinkCreate
from app.schemas.audit import StatusHistoryOut
from app.services.incident_service import incident_service
from app.api.dependencies.auth import get_current_user, require_admin, require_any_authenticated
from app.models.user import User

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_incident(
    inc_in: IncidentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Create an incident work order and optionally link an initial report."""
    incident = incident_service.create_incident(db, inc_in, current_user)
    return incident_service.get_incident_detail(db, incident.id)

@router.get("/", response_model=List[dict])
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    zone: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """List incidents with filtering by status, severity, priority, or zone."""
    incidents, total = incident_service.list_incidents(
        db=db,
        status=status,
        severity=severity,
        priority=priority,
        zone=zone,
        skip=skip,
        limit=limit
    )
    return incidents

@router.get("/{incident_id}", response_model=dict)
def get_incident(
    incident_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Get complete details of an incident including linked reports and evidence."""
    return incident_service.get_incident_detail(db, incident_id)

@router.get("/{incident_id}/history", response_model=List[StatusHistoryOut])
def get_incident_history(
    incident_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Retrieve end-to-end lifecycle status change history for an incident."""
    return incident_service.get_incident_status_history(db, incident_id)

@router.put("/{incident_id}", response_model=dict)
def update_incident(
    incident_id: str,
    inc_update: IncidentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Update incident severity, priority, status, or details."""
    incident = incident_service.update_incident(db, incident_id, inc_update, current_user)
    return incident_service.get_incident_detail(db, incident.id)

@router.post("/{incident_id}/link", response_model=dict)
def link_report_to_incident(
    incident_id: str,
    link_in: ReportIncidentLinkCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Link a citizen report to an existing incident."""
    incident_service.link_report(
        db=db,
        incident_id=incident_id,
        report_id=link_in.report_id,
        admin=current_user,
        notes=link_in.notes
    )
    return incident_service.get_incident_detail(db, incident_id)
