import sys
import os
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import feedback_service
from app.core.exceptions import BadRequestException

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_feedback_lifecycle(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    assert citizen is not None

    import uuid
    test_report_number = f"REP-TEST-FB-{uuid.uuid4().hex[:6]}"
    test_report = Report(
        citizen_id=citizen.id,
        report_number=test_report_number,
        title="Test Water Leak for Rating",
        category="pipe_leak",
        description="Testing rating feature",
        estimated_flow="trickle",
        latitude=12.9716,
        longitude=77.5946,
        address_text="123 Test Street",
        status="submitted"
    )
    db.add(test_report)
    db.commit()
    db.refresh(test_report)

    # 1. Submitting feedback when status is 'submitted' should raise BadRequestException
    fb_in = FeedbackCreate(
        rating=5,
        satisfaction_category="Fast Response",
        comments="Fixed very quickly, great job!"
    )
    with pytest.raises(BadRequestException):
        feedback_service.create_or_update_feedback(
            db=db,
            report_id=test_report.id,
            citizen=citizen,
            feedback_in=fb_in
        )

    # 2. Mark report resolved and submit feedback successfully
    test_report.status = "resolved"
    db.commit()

    created_fb = feedback_service.create_or_update_feedback(
        db=db,
        report_id=test_report.id,
        citizen=citizen,
        feedback_in=fb_in
    )

    assert created_fb["rating"] == 5
    assert created_fb["satisfaction_category"] == "Fast Response"
    assert created_fb["comments"] == "Fixed very quickly, great job!"

    # 3. Retrieve feedback by report ID
    fetched_fb = feedback_service.get_feedback_by_report(db, test_report.id)
    assert fetched_fb is not None
    assert fetched_fb["rating"] == 5

    # 4. Update existing feedback
    update_in = FeedbackCreate(
        rating=4,
        satisfaction_category="Clean Worksite",
        comments="Updated review: good work overall."
    )
    updated_fb = feedback_service.create_or_update_feedback(
        db=db,
        report_id=test_report.id,
        citizen=citizen,
        feedback_in=update_in
    )
    assert updated_fb["rating"] == 4
    assert updated_fb["comments"] == "Updated review: good work overall."

    # 5. Check stats
    stats = feedback_service.get_stats(db)
    assert stats["total_reviews"] >= 1
    assert stats["average_rating"] > 0
