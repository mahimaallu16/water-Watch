from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.report import ReportCreate, ReportOut, AdditionalEvidenceSubmit
from app.schemas.common import MessageResponse
from app.services.report_service import report_service
from app.core.deps import get_current_user, require_citizen, require_any_authenticated
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def submit_report(
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    estimated_flow: str = Form("moderate_stream"),
    affected_households: int = Form(1),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address_text: str = Form(...),
    landmark: Optional[str] = Form(None),
    images: List[UploadFile] = File(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Citizen: Submit a new water issue report with location coordinates and photographs."""
    report_in = ReportCreate(
        title=title,
        category=category,
        description=description,
        estimated_flow=estimated_flow,
        affected_households=affected_households,
        latitude=latitude,
        longitude=longitude,
        address_text=address_text,
        landmark=landmark
    )

    report = report_service.create_report(
        db=db,
        report_in=report_in,
        citizen=current_user,
        images=images,
        background_tasks=background_tasks
    )

    return report_service.get_report_by_id(db, report.id)

@router.get("/", response_model=List[dict])
def list_reports(
    status: Optional[str] = None,
    category: Optional[str] = None,
    mine: bool = False,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """List water reports with filtering. Citizens see their own reports if mine=True or role=citizen."""
    citizen_filter = None
    if current_user.role == "citizen" or mine:
        citizen_filter = current_user.id

    reports, total = report_service.list_reports(
        db=db,
        citizen_id=citizen_filter,
        status=status,
        category=category,
        skip=skip,
        limit=limit
    )
    return reports

@router.get("/nearby", response_model=List[dict])
def get_nearby_reports(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Citizen & Admin: View nearby reported water issues on map within radius."""
    return report_service.get_nearby_reports(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km
    )

@router.get("/{report_id}", response_model=dict)
def get_report(
    report_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Get full details of a specific water report."""
    return report_service.get_report_by_id(db, report_id)

@router.post("/{report_id}/evidence", response_model=dict)
def submit_additional_evidence(
    report_id: str,
    notes: Optional[str] = Form(None),
    images: List[UploadFile] = File(None),
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Submit additional evidence or follow-up notes for an existing report."""
    report = report_service.add_additional_evidence(
        db=db,
        report_id=report_id,
        user=current_user,
        images=images,
        notes=notes
    )
    return report_service.get_report_by_id(db, report.id)

