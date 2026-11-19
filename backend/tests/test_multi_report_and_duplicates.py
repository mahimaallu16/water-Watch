import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report, DuplicateCandidate
from app.models.incident import Incident, ReportIncidentLink
from app.models.assignment import Assignment, RepairEvidence
from app.schemas.incident import IncidentCreate
from app.schemas.assignment import VerificationRequest
from app.schemas.report import DuplicateReviewRequest
from app.services.incident_service import incident_service
from app.services.assignment_service import assignment_service
from app.services.ai_service import ai_service

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_multiple_reports_linked_to_one_incident(db):
    admin = db.query(User).filter(User.role == "admin").first()
    worker = db.query(User).filter(User.role == "worker").first()
    citizen = db.query(User).filter(User.role == "citizen").first()
    assert admin and worker and citizen

    # 1. Create a single incident
    inc_in = IncidentCreate(
        title="Multi-Report Burst Water Main",
        category="pipe_leak",
        description="Major burst main affecting several residents in Oakridge area.",
        severity="critical",
        priority="p1",
        latitude=12.9750,
        longitude=77.5950,
        address_text="Corner of 4th and Oakridge",
        zone="Central"
    )
    incident = incident_service.create_incident(db, inc_in, admin)

    # 2. Create 3 independent citizen reports
    rep_ids = []
    for i in range(1, 4):
        rep = Report(
            citizen_id=citizen.id,
            report_number=f"REP-MULTI-{datetime.now(timezone.utc).microsecond}-{i}",
            title=f"Burst pipe near house #{i}",
            category="pipe_leak",
            description=f"Water leaking onto street from main pipe near house {i}.",
            latitude=12.9750 + (i * 0.0001),
            longitude=77.5950 + (i * 0.0001),
            address_text=f"{i * 10} Oakridge Road",
            status="submitted"
        )
        db.add(rep)
        db.flush()
        rep_ids.append(rep.id)
    db.commit()

    # 3. Link all 3 reports to the single incident
    for rid in rep_ids:
        incident_service.link_report(db, incident.id, rid, admin, notes=f"Linked report {rid} to burst main")

    detail = incident_service.get_incident_detail(db, incident.id)
    assert detail["linked_reports_count"] == 3
    for rid in rep_ids:
        assert any(r["id"] == rid for r in detail["linked_reports"])

    # 4. Field worker executes repair
    assign = Assignment(
        incident_id=incident.id,
        worker_id=worker.id,
        assigned_by=admin.id,
        status="in_progress",
        priority="p1"
    )
    db.add(assign)
    db.flush()

    ev = RepairEvidence(
        assignment_id=assign.id,
        incident_id=incident.id,
        worker_id=worker.id,
        evidence_type="after",
        image_url="/uploads/evidence/sample_before_repair.jpg",
        notes="Main line welded and pressure restored."
    )
    db.add(ev)
    db.commit()

    # Worker submits repair
    assignment_service.submit_completion(db, assign.id, "Repair complete", worker)

    # 5. Admin verifies and approves resolution
    verify_req = VerificationRequest(approved=True, feedback_notes="All 3 residents inspected and water flow clear.")
    resolved_inc = assignment_service.verify_resolution(db, incident.id, verify_req, admin)
    assert resolved_inc.status == "resolved"

    # CRITICAL: Verify that resolving the 1 incident cascaded and marked all 3 linked reports as resolved!
    for rid in rep_ids:
        rep_check = db.query(Report).filter(Report.id == rid).first()
        assert rep_check.status == "resolved"

def test_duplicate_review_workflow(db):
    admin = db.query(User).filter(User.role == "admin").first()
    citizen = db.query(User).filter(User.role == "citizen").first()

    # Create two reports close in location and time
    r1 = Report(
        citizen_id=citizen.id,
        report_number=f"REP-DUP1-{datetime.now(timezone.utc).microsecond}",
        title="Gushing water on Park St",
        category="pipe_leak",
        description="Massive leak gushing from asphalt on Park Street.",
        latitude=12.9730,
        longitude=77.5930,
        address_text="50 Park Street",
        status="submitted"
    )
    r2 = Report(
        citizen_id=citizen.id,
        report_number=f"REP-DUP2-{datetime.now(timezone.utc).microsecond}",
        title="Water leak near 52 Park Street",
        category="pipe_leak",
        description="Asphalt rupture with large volume water leak.",
        latitude=12.9731,
        longitude=77.5931,
        address_text="52 Park Street",
        status="submitted"
    )
    db.add_all([r1, r2])
    db.commit()

    # AI engine flags them as candidate duplicates
    cand = DuplicateCandidate(
        report_id=r1.id,
        potential_duplicate_report_id=r2.id,
        similarity_score=0.91,
        distance_meters=18.5,
        time_diff_hours=0.5,
        text_similarity=0.78,
        category_match=True,
        status="detected"
    )
    db.add(cand)
    db.commit()

    # Admin retrieves duplicates
    candidates = ai_service.get_duplicate_candidates(db, status="detected")
    assert any(c["id"] == cand.id for c in candidates)

    # Admin reviews and dismisses candidate (human-in-the-loop decision)
    rev_req = DuplicateReviewRequest(
        status="dismissed",
        notes="Different pipes on opposite sides of property"
    )
    reviewed = ai_service.review_duplicate(db, cand.id, rev_req, admin)
    assert reviewed.status == "dismissed"
    assert reviewed.reviewed_by == admin.id
    assert reviewed.reviewed_at is not None

    # Verify report r2 was NOT deleted or silently merged
    r2_check = db.query(Report).filter(Report.id == r2.id).first()
    assert r2_check is not None

