from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.audit import AuditLogOut, StatusHistoryOut
from app.services.audit_service import audit_service
from app.core.deps import require_admin, require_any_authenticated
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["Audit & History"])

@router.get("/logs", response_model=List[AuditLogOut])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Inspect system audit log trail."""
    return audit_service.get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        action=action,
        entity_type=entity_type
    )

@router.get("/history/{entity_type}/{entity_id}", response_model=List[StatusHistoryOut])
def get_status_history(
    entity_type: str,
    entity_id: str,
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """Retrieve end-to-end status lifecycle history for a report or incident."""
    return audit_service.get_status_history(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id
    )

