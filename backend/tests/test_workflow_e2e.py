import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report
from app.models.incident import Incident
from app.models.assignment import Assignment, RepairEvidence
from app.models.notification import Notification
from app.models.audit import AuditLog, StatusHistory
from app.schemas.report import ReportCreate
from app.schemas.incident import IncidentCreate
from app.schemas.assignment import AssignmentCreate, VerificationRequest
from app.services.report_service import report_service
from app.services.incident_service import incident_service
from app.services.assignment_service import assignment_service
from app.tasks.background import execute_report_ai_analysis

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_full_report_to_repair_lifecycle(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    admin = db.query(User).filter(User.role == "admin").first()
    worker = db.query(User).filter(User.role == "worker").first()

    # Step 1: Citizen submits report
    rep_in = ReportCreate(
        title="E2E Pipeline Test Leak",
        category="pipe_leak",
        description="End-to-end testing water leakage on 1st cross.",
        estimated_flow="heavy_flow",
        affected_households=15,
        latitude=12.9730,
        longitude=77.5960,
        address_text="1st Cross, Near Water Tank"
    )
    report = report_service.create_report(db, rep_in, citizen, images=None, background_tasks=None)
    assert report.status == "submitted"

    # Step 2: Background AI analyzes report
    execute_report_ai_analysis(report.id, db=db)
    assert len(report.ai_suggestions) > 0

    # Step 3: Admin reviews report and creates incident
    inc_in = IncidentCreate(
        title="Resolved Pipeline Rupture E2E",
        category=report.category,
        description=f"Formed from citizen report {report.report_number}",
        severity="high",
        priority="p2",
        latitude=report.latitude,
        longitude=report.longitude,
        address_text=report.address_text,
        zone="Central",
        initial_report_id=report.id
    )
    incident = incident_service.create_incident(db, inc_in, admin)
    assert incident.status == "investigating"
    
    # Check that report is linked
    refreshed_rep = db.query(Report).filter(Report.id == report.id).first()
    assert refreshed_rep.status == "linked"

    # Step 4: Admin assigns incident to field worker
    assign_in = AssignmentCreate(
        incident_id=incident.id,
        worker_id=worker.id,
        instructions="Clamp pipeline and test pressure seal.",
        priority="p2"
    )
    assignment = assignment_service.assign_worker(db, assign_in, admin)
    assert assignment.status == "assigned"
    assert incident.status == "assigned"

    # Step 5: Worker accepts assignment
    accepted = assignment_service.accept_assignment(db, assignment.id, worker)
    assert accepted.status == "accepted"
    assert incident.status == "in_progress"

    # Step 6: Worker updates repair progress
    upd = assignment_service.add_repair_update(db, assignment.id, "arrival", "Crew on site, valve isolated.", worker)
    assert upd is not None

    # Step 7: Worker attaches repair evidence
    ev = RepairEvidence(
        assignment_id=assignment.id,
        incident_id=incident.id,
        worker_id=worker.id,
        evidence_type="after",
        image_url="/uploads/evidence/sample_before_repair.jpg",
        notes="New heavy-duty collar clamped and tested.",
        materials_used="12-inch stainless clamp, rubber gasket"
    )
    db.add(ev)
    db.commit()

    # Step 8: Worker submits completed work for verification
    comp = assignment_service.submit_completion(db, assignment.id, "Repairs complete, pressure restored.", worker)
    assert comp.status == "completed"
    assert incident.status == "work_submitted"

    # Step 9: Administrator verifies and approves resolution
    verify = VerificationRequest(approved=True, feedback_notes="Thorough repair verified by supervisor.")
    resolved_inc = assignment_service.verify_resolution(db, incident.id, verify, admin)
    assert resolved_inc.status == "resolved"
    assert resolved_inc.resolved_at is not None

    # Step 10: Verify linked citizen report is marked resolved
    db.refresh(refreshed_rep)
    assert refreshed_rep.status == "resolved"

    # Step 11: Verify status history trail
    histories = db.query(StatusHistory).filter(StatusHistory.entity_id == incident.id).all()
    assert len(histories) >= 4 # investigating -> assigned -> in_progress -> work_submitted -> resolved

    # Step 12: Verify citizen received resolution notification
    citizen_notifs = db.query(Notification).filter(Notification.user_id == citizen.id).all()
    assert any("Resolved" in n.title or "resolved" in n.message.lower() for n in citizen_notifs)

