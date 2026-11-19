import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.schemas.team import TeamCreate, WorkerRegisterByAdmin
from app.services.team_service import team_service
from app.services.analytics_service import analytics_service

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_team_listing_and_creation(db):
    admin = db.query(User).filter(User.role == "admin").first()
    assert admin is not None

    # List teams
    teams = team_service.list_teams(db)
    assert len(teams) >= 5
    assert any(t["zone"] == "Central" for t in teams)

    # Create new custom team
    unique_zone = f"Sector_{datetime.now(timezone.utc).microsecond}"
    team_in = TeamCreate(
        name="Sector Quick Response Crew",
        zone=unique_zone,
        department="Rapid Logistics",
        specialization="High-Pressure Main Leak",
        description="Rapid crew for industrial sector"
    )
    created_team = team_service.create_team(db, team_in, admin)
    assert created_team["name"] == "Sector Quick Response Crew"
    assert created_team["zone"] == unique_zone

def test_admin_worker_registration(db):
    admin = db.query(User).filter(User.role == "admin").first()
    unique_emp_id = f"EMP-{datetime.now(timezone.utc).microsecond}"
    w_email = f"tech_{datetime.now(timezone.utc).microsecond}@waterwatch.org"

    reg_in = WorkerRegisterByAdmin(
        email=w_email,
        password="TechnicianPass123!",
        full_name="Alex Master Plumber",
        phone="+1-555-8888",
        employee_id=unique_emp_id,
        department="Water Distribution",
        zone="Central",
        specialization="Hydraulic Pressure Valves",
        max_active_tasks=6
    )

    worker = team_service.register_worker(db, reg_in, admin)
    assert worker.id is not None
    assert worker.role == "worker"
    assert worker.worker_profile.employee_id == unique_emp_id
    assert worker.worker_profile.specialization == "Hydraulic Pressure Valves"
    assert worker.worker_profile.max_active_tasks == 6

def test_analytics_kpis_and_reports(db):
    # 1. Dashboard KPIs
    kpis = analytics_service.get_dashboard_kpis(db)
    assert "total_reports" in kpis
    assert "open_incidents" in kpis
    assert "assigned_incidents" in kpis
    assert "in_progress_incidents" in kpis
    assert "pending_verification" in kpis
    assert "resolved_incidents" in kpis
    assert "reports_by_category" in kpis
    assert "incidents_by_severity" in kpis
    assert "trends" in kpis

    # 2. Monthly statistics
    monthly = analytics_service.get_monthly_statistics(db)
    assert len(monthly) == 6
    assert "month" in monthly[0]
    assert "reports_count" in monthly[0]

    # 3. Geographic summaries
    geo = analytics_service.get_geographic_summaries(db)
    assert len(geo) == 5
    assert any(g["zone"] == "Central" for g in geo)
    assert "total_incidents" in geo[0]
