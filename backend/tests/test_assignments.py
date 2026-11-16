import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.incident import Incident
from app.models.assignment import Assignment, RepairEvidence
from app.schemas.assignment import AssignmentCreate, VerificationRequest
from app.services.assignment_service import assignment_service
from app.services.incident_service import incident_service

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_assignment_lifecycle(db):
    admin = db.query(User).filter(User.role == "admin").first()
    worker = db.query(User).filter(User.role == "worker").first()
    assert admin is not None
    assert worker is not None

    # Create incident for assignment
    inc = Incident(
        incident_number=f"INC-TEST-{datetime.now(timezone.utc).microsecond}",
        title="Incident for Worker Assignment Test",
        category="pipe_leak",
        description="Testing worker dispatch flow",
        severity="medium",
        priority="p3",
        status="investigating",
        latitude=12.9710,
        longitude=77.5920,
        address_text="Station Road",
        zone="Central",
        created_by=admin.id
    )
    db.add(inc)
    db.commit()

    # 1. Admin assigns worker
    assign_in = AssignmentCreate(
        incident_id=inc.id,
        worker_id=worker.id,
        instructions="Inspect pipe joint and patch leak.",
        priority="p2"
    )
    assignment = assignment_service.assign_worker(db, assign_in, admin)
    assert assignment.status == "assigned"
    assert inc.status == "assigned"

    # 2. Worker accepts assignment
    accepted = assignment_service.accept_assignment(db, assignment.id, worker)
    assert accepted.status == "accepted"
    assert inc.status == "in_progress"

    # 3. Worker adds update note
    upd = assignment_service.add_repair_update(db, assignment.id, "arrival", "Arrived at site with equipment.", worker)
    assert upd.notes == "Arrived at site with equipment."

    # 4. Attach evidence photograph directly to model
    ev = RepairEvidence(
        assignment_id=assignment.id,
        incident_id=inc.id,
        worker_id=worker.id,
        evidence_type="after",
        image_url="/uploads/evidence/sample_before_repair.jpg",
        notes="Repair clamp bolted and tested pressure."
    )
    db.add(ev)
    db.commit()

    # 5. Worker submits completion
    completed = assignment_service.submit_completion(db, assignment.id, "Completed successfully.", worker)
    assert completed.status == "completed"
    assert inc.status == "work_submitted"

    # 6. Admin verifies resolution
    verify_req = VerificationRequest(approved=True, feedback_notes="Verified by admin.")
    resolved_inc = assignment_service.verify_resolution(db, inc.id, verify_req, admin)
    assert resolved_inc.status == "resolved"
    assert resolved_inc.resolved_at is not None

