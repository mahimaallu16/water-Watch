import sys
import os
import io
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.datastructures import Headers, UploadFile
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.incident import Incident
from app.models.assignment import Assignment
from app.core.exceptions import BadRequestException
from app.utils.geo import validate_coordinates
from app.utils.status import validate_incident_transition, validate_report_transition
from app.services.image_service import validate_and_save_image
from app.services.assignment_service import assignment_service

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_coordinate_validation():
    # Valid coordinates
    lat, lon = validate_coordinates(12.9716, 77.5946)
    assert lat == 12.9716
    assert lon == 77.5946

    # Invalid latitude (> 90.0)
    with pytest.raises(BadRequestException) as exc:
        validate_coordinates(95.0, 77.5946)
    assert "Invalid latitude" in str(exc.value)

    # Invalid latitude (< -90.0)
    with pytest.raises(BadRequestException):
        validate_coordinates(-95.0, 77.5946)

    # Invalid longitude (> 180.0)
    with pytest.raises(BadRequestException) as exc:
        validate_coordinates(12.9716, 185.0)
    assert "Invalid longitude" in str(exc.value)

    # Invalid longitude (< -180.0)
    with pytest.raises(BadRequestException):
        validate_coordinates(12.9716, -185.0)

def test_incident_status_transitions():
    # Valid transitions
    assert validate_incident_transition("investigating", "assigned") == "assigned"
    assert validate_incident_transition("assigned", "in_progress") == "in_progress"
    assert validate_incident_transition("in_progress", "work_submitted") == "work_submitted"
    assert validate_incident_transition("work_submitted", "resolved") == "resolved"
    assert validate_incident_transition("resolved", "closed") == "closed"

    # Invalid transitions
    with pytest.raises(BadRequestException) as exc:
        validate_incident_transition("closed", "assigned")
    assert "Invalid incident status transition" in str(exc.value)

    with pytest.raises(BadRequestException):
        validate_incident_transition("investigating", "work_submitted")

def test_report_status_transitions():
    assert validate_report_transition("submitted", "linked") == "linked"
    assert validate_report_transition("linked", "resolved") == "resolved"

    with pytest.raises(BadRequestException) as exc:
        validate_report_transition("resolved", "submitted")
    assert "Invalid report status transition" in str(exc.value)

def test_image_mime_type_validation():
    # Fake PDF file with application/pdf header
    pdf_content = b"%PDF-1.4 test binary data"
    fake_file = UploadFile(
        file=io.BytesIO(pdf_content),
        filename="document.pdf",
        headers=Headers({"content-type": "application/pdf"})
    )

    with pytest.raises(BadRequestException) as exc:
        validate_and_save_image(fake_file, subfolder="reports")
    assert "Unsupported image format" in str(exc.value)

def test_image_corrupted_file_validation():
    # File with JPEG MIME type header but invalid/corrupted header
    corrupt_content = b"NotARealJPEGImageContentHeader"
    fake_file = UploadFile(
        file=io.BytesIO(corrupt_content),
        filename="broken.jpg",
        headers=Headers({"content-type": "image/jpeg"})
    )

    with pytest.raises(BadRequestException) as exc:
        validate_and_save_image(fake_file, subfolder="reports")
    assert "Invalid or corrupted image" in str(exc.value)

def test_worker_cannot_submit_completion_without_evidence(db):
    admin = db.query(User).filter(User.role == "admin").first()
    worker = db.query(User).filter(User.role == "worker").first()

    inc = Incident(
        incident_number=f"INC-NOEV-{datetime.now(timezone.utc).microsecond}",
        title="No Evidence Incident",
        category="pipe_leak",
        description="Testing completion block without photo",
        severity="medium",
        priority="p3",
        status="in_progress",
        latitude=12.9710,
        longitude=77.5920,
        address_text="Site without photos",
        created_by=admin.id
    )
    db.add(inc)
    db.flush()

    assign = Assignment(
        incident_id=inc.id,
        worker_id=worker.id,
        assigned_by=admin.id,
        status="in_progress",
        priority="p3"
    )
    db.add(assign)
    db.commit()

    # Attempting to submit completion with ZERO evidence photos must fail
    with pytest.raises(BadRequestException) as exc:
        assignment_service.submit_completion(db, assign.id, "Finished without photos", worker)
    assert "You must upload at least one repair evidence photograph" in str(exc.value)
