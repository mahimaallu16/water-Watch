import sys
import os
import pytest
from datetime import datetime, timezone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.report import Report
from app.models.incident import Incident
from app.models.assignment import Assignment
from app.core.exceptions import ForbiddenException, UnauthorizedException, ConflictException, BadRequestException
from app.api.dependencies.auth import require_admin, require_worker, require_citizen
from app.services.auth_service import auth_service
from app.services.report_service import report_service
from app.services.assignment_service import assignment_service
from app.schemas.user import UserRegister, UserLogin

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_registration_and_duplicate_email(db):
    email = f"testuser_{datetime.now(timezone.utc).microsecond}@example.com"
    reg_data = UserRegister(
        email=email,
        password="ValidPassword123!",
        full_name="Test Resident User",
        role="resident",
        address="123 Ocean Street"
    )
    user = auth_service.register_user(db, reg_data)
    assert user.id is not None
    assert user.role == "citizen" # resident normalized to citizen

    # Attempting to register same email raises conflict
    with pytest.raises(ConflictException) as exc:
        auth_service.register_user(db, reg_data)
    assert "already exists" in str(exc.value)

def test_login_invalid_password(db):
    creds = UserLogin(email="admin@waterwatch.org", password="WrongPassword!")
    with pytest.raises(UnauthorizedException):
        auth_service.authenticate_user(db, creds)

def test_role_restrictions_resident_cannot_pass_admin_dependency(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    assert citizen is not None

    # Resident attempting to execute admin-protected logic
    with pytest.raises(ForbiddenException) as exc:
        require_admin(citizen)
    assert "requires one of roles: admin" in str(exc.value)

def test_role_restrictions_worker_cannot_pass_admin_dependency(db):
    worker = db.query(User).filter(User.role == "worker").first()
    assert worker is not None

    with pytest.raises(ForbiddenException) as exc:
        require_admin(worker)
    assert "requires one of roles: admin" in str(exc.value)

def test_resident_report_ownership_enforcement(db):
    c1_user = db.query(User).filter(User.role == "citizen").first()
    assert c1_user is not None

    # Create Citizen 2
    c2_email = f"resident2_{datetime.now(timezone.utc).microsecond}@example.com"
    c2_user = auth_service.register_user(db, UserRegister(
        email=c2_email,
        password="Password123!",
        full_name="Second Resident",
        role="resident"
    ))

    # Citizen 1 creates report
    rep = Report(
        citizen_id=c1_user.id,
        report_number=f"REP-PRIV-{datetime.now(timezone.utc).microsecond}",
        title="Citizen 1 Private Report",
        category="pipe_leak",
        description="Leak in backyard",
        latitude=12.9700,
        longitude=77.5900,
        address_text="Citizen 1 Home",
        status="submitted"
    )
    db.add(rep)
    db.commit()

    # Citizen 1 can access their report
    r1 = report_service.get_report_by_id(db, rep.id, current_user=c1_user)
    assert r1["id"] == rep.id

    # Citizen 2 is FORBIDDEN from accessing Citizen 1's report
    with pytest.raises(ForbiddenException) as exc:
        report_service.get_report_by_id(db, rep.id, current_user=c2_user)
    assert "own reports" in str(exc.value)

def test_worker_assignment_ownership_enforcement(db):
    w1_user = db.query(User).filter(User.role == "worker").first()
    assert w1_user is not None

    # Worker 2
    w2_email = f"worker2_{datetime.now(timezone.utc).microsecond}@waterwatch.org"
    w2_user = auth_service.register_user(db, UserRegister(
        email=w2_email,
        password="Password123!",
        full_name="Second Field Worker",
        role="worker",
        employee_id=f"WKR-{datetime.now(timezone.utc).microsecond}"
    ))

    # Admin creates assignment for Worker 1
    admin = db.query(User).filter(User.role == "admin").first()
    inc = Incident(
        incident_number=f"INC-OWN-{datetime.now(timezone.utc).microsecond}",
        title="Ownership Test Incident",
        category="pipe_leak",
        description="Testing worker authorization isolation",
        severity="medium",
        priority="p3",
        status="assigned",
        latitude=12.9710,
        longitude=77.5920,
        address_text="Test Alley",
        created_by=admin.id
    )
    db.add(inc)
    db.flush()

    assign = Assignment(
        incident_id=inc.id,
        worker_id=w1_user.id,
        assigned_by=admin.id,
        status="assigned",
        priority="p3"
    )
    db.add(assign)
    db.commit()

    # Worker 2 attempts to accept Worker 1's assignment -> ForbiddenException
    with pytest.raises(ForbiddenException) as exc:
        assignment_service.accept_assignment(db, assign.id, w2_user)
    assert "only accept your own assignments" in str(exc.value)

    # Worker 2 attempts to view Worker 1's assignment detail -> ForbiddenException
    with pytest.raises(ForbiddenException) as exc:
        assignment_service.get_assignment_detail(db, assign.id, w2_user)
    assert "not authorized" in str(exc.value)

    # Worker 1 successfully accepts
    accepted = assignment_service.accept_assignment(db, assign.id, w1_user)
    assert accepted.status == "accepted"

def test_logout(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    res = auth_service.logout_user(db, citizen)
    assert res["status"] == "logged_out"
