from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.analytics import (
    DashboardKPIs,
    WorkerPerformanceStat,
    MonthlyReportStat,
    GeographicIncidentSummary
)
from app.services.analytics_service import analytics_service
from app.api.dependencies.auth import require_admin
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Operational Insights"])

@router.get("/dashboard", response_model=DashboardKPIs)
def get_dashboard_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator: Operational dashboard metrics for Recharts visualization.
    Returns counts for total reports, open, verified, assigned, in-progress, pending verification, and resolved incidents,
    as well as category breakdowns, severity distribution, zone distribution, and 14-day trends.
    """
    return analytics_service.get_dashboard_kpis(db)

@router.get("/workers", response_model=List[WorkerPerformanceStat])
def get_worker_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Field worker turnaround times, completion counts, and verification approval rates."""
    return analytics_service.get_worker_performance_metrics(db)

@router.get("/reports/monthly", response_model=List[MonthlyReportStat])
def get_monthly_report_statistics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Monthly report submission and incident resolution statistics for trend charts."""
    return analytics_service.get_monthly_statistics(db)

@router.get("/incidents/geographic", response_model=List[GeographicIncidentSummary])
def get_geographic_incident_summaries(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Geographic incident summaries by municipal zone with GPS centroids and status counts."""
    return analytics_service.get_geographic_summaries(db)
