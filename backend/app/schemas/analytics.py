from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CategoryStat(BaseModel):
    category: str
    count: int
    percentage: float

class StatusStat(BaseModel):
    status: str
    count: int

class SeverityStat(BaseModel):
    severity: str
    count: int
    percentage: Optional[float] = None

class ZoneStat(BaseModel):
    zone: str
    incident_count: int
    resolved_count: int

class TrendDataPoint(BaseModel):
    date: str
    reports_count: int
    resolved_count: int

class MonthlyReportStat(BaseModel):
    month: str # e.g. 'Nov 2026'
    reports_count: int
    resolved_count: int

class GeographicIncidentSummary(BaseModel):
    zone: str
    total_incidents: int
    open_incidents: int
    assigned_incidents: int
    in_progress_incidents: int
    pending_verification_incidents: int
    resolved_incidents: int
    avg_latitude: Optional[float] = None
    avg_longitude: Optional[float] = None

class WorkerPerformanceStat(BaseModel):
    worker_id: str
    worker_name: str
    employee_id: Optional[str] = "EMP-001"
    department: Optional[str] = "Water Operations"
    zone: Optional[str] = "Central"
    specialization: Optional[str] = "General Plumbing"
    completed_tasks: int
    active_tasks: int
    avg_resolution_hours: float
    verification_rate: float

class DashboardKPIs(BaseModel):
    total_reports: int
    pending_reviews: int
    active_incidents: int
    open_incidents: int = 0
    verified_incidents: int = 0
    assigned_incidents: int = 0
    in_progress_incidents: int = 0
    pending_verification: int = 0
    resolved_incidents: int
    average_resolution_hours: float
    critical_incidents: int
    duplicate_candidates_count: int
    reports_by_category: List[CategoryStat]
    reports_by_status: List[StatusStat]
    incidents_by_severity: List[SeverityStat]
    incidents_by_zone: List[ZoneStat]
    trends: List[TrendDataPoint]
    recent_activity: List[Dict[str, Any]]
