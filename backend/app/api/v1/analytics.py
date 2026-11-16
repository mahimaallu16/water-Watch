from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.analytics import DashboardKPIs, WorkerPerformanceStat
from app.services.analytics_service import analytics_service
from app.core.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Operational Insights"])

@router.get("/dashboard", response_model=DashboardKPIs)
def get_dashboard_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Real-time operational metrics, category breakdowns, severity, and resolution trends."""
    return analytics_service.get_dashboard_kpis(db)

@router.get("/workers", response_model=List[WorkerPerformanceStat])
def get_worker_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Field worker turnaround times, completion stats, and verification approval rates."""
    return analytics_service.get_worker_performance_metrics(db)

