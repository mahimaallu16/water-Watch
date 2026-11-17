import sys
import os
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report
from app.schemas.report import ReportCreate
from app.services.report_service import report_service
from app.ai.duplicate_detector import calculate_haversine_distance_meters

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_haversine_distance():
    # Test distance between 5th Ave and Elm St (~62 meters)
    dist = calculate_haversine_distance_meters(12.9718, 77.5948, 12.9721, 77.5950)
    assert 30.0 < dist < 100.0

def test_create_and_fetch_report(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    assert citizen is not None

    rep_in = ReportCreate(
        title="Automated Test Leak Report",
        category="pipe_leak",
        description="Testing automated report creation pipeline.",
        estimated_flow="moderate_stream",
        affected_households=5,
        latitude=12.9750,
        longitude=77.5980,
        address_text="100 Test Blvd, Central Zone"
    )

    report = report_service.create_report(
        db=db,
        report_in=rep_in,
        citizen=citizen,
        images=None,
        background_tasks=None
    )

    assert report.id is not None
    assert report.report_number.startswith("REP-")
    assert report.status == "submitted"

    fetched = report_service.get_report_by_id(db, report.id)
    assert fetched["title"] == "Automated Test Leak Report"
    assert fetched["citizen_name"] == citizen.full_name

def test_get_nearby_reports(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    assert citizen is not None

    # Ensure a report exists nearby
    nearby_existing = report_service.get_nearby_reports(db, latitude=12.9718, longitude=77.5948, radius_km=5.0)
    if not nearby_existing:
        rep_in = ReportCreate(
            title="Nearby Test Report",
            category="pipe_leak",
            description="Nearby leak test",
            estimated_flow="moderate_stream",
            affected_households=2,
            latitude=12.9720,
            longitude=77.5950,
            address_text="Market Street"
        )
        report_service.create_report(db, rep_in, citizen)

    nearby = report_service.get_nearby_reports(db, latitude=12.9718, longitude=77.5948, radius_km=5.0)
    assert len(nearby) > 0
    assert "distance_km" in nearby[0]
