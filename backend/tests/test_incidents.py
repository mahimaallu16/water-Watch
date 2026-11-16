import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services.incident_service import incident_service
from app.services.report_service import report_service

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_create_incident_and_link_reports(db):
    admin = db.query(User).filter(User.role == "admin").first()
    assert admin is not None

    inc_in = IncidentCreate(
        title="Test Incident Pipeline",
        category="damaged_valve",
        description="Testing incident creation and linking.",
        severity="high",
        priority="p2",
        latitude=12.9800,
        longitude=77.6000,
        address_text="North Hub Substation",
        zone="North"
    )

    incident = incident_service.create_incident(db, inc_in, admin)
    assert incident.id is not None
    assert incident.incident_number.startswith("INC-")
    assert incident.status == "investigating"

    # Fetch a report to link
    citizen = db.query(User).filter(User.role == "citizen").first()
    rep = Report(
        citizen_id=citizen.id,
        report_number=f"REP-TEST-{datetime.now(timezone.utc).microsecond}",
        title="Valve fault for linking test",
        category="damaged_valve",
        description="Valve leaking on North Hub",
        latitude=12.9801,
        longitude=77.6001,
        address_text="North Hub Substation",
        status="submitted"
    )
    db.add(rep)
    db.commit()

    # Link report to incident
    link = incident_service.link_report(db, incident.id, rep.id, admin, notes="Linked during test")
    assert link.incident_id == incident.id
    assert link.report_id == rep.id

    detail = incident_service.get_incident_detail(db, incident.id)
    assert detail["linked_reports_count"] >= 1
    assert any(r["id"] == rep.id for r in detail["linked_reports"])

    # Update incident
    upd = IncidentUpdate(severity="critical", priority="p1")
    updated_inc = incident_service.update_incident(db, incident.id, upd, admin)
    assert updated_inc.severity == "critical"
    assert updated_inc.priority == "p1"

