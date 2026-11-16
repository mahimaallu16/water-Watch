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

class ZoneStat(BaseModel):
    zone: str
    incident_count: int
    resolved_count: int

class TrendDataPoint(BaseModel):
    date: str
    reports_count: int
    resolved_count: int

class WorkerPerformanceStat(BaseModel):
    worker_id: str
    worker_name: str
    completed_tasks: int
    active_tasks: int
    avg_resolution_hours: float
    verification_rate: float

class DashboardKPIs(BaseModel):
    total_reports: int
    pending_reviews: int
    active_incidents: int
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

