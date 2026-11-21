import sys
import os
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin
from app.services.auth_service import auth_service
from app.core.security import verify_password, create_access_token, decode_access_token

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_password_hashing_and_verification():
    from app.core.security import hash_password
    pw = "SuperSecure123!"
    h = hash_password(pw)
    assert verify_password(pw, h) is True
    assert verify_password("WrongPassword", h) is False

def test_jwt_token_generation_and_decoding():
    token = create_access_token(subject="user-12345", role="admin")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-12345"
    assert payload["role"] == "admin"

def test_user_authentication(db):
    creds = UserLogin(email="admin@waterwatch.org", password="Password123!")
    token_resp = auth_service.authenticate_user(db, creds)
    assert token_resp.role == "admin"
    assert token_resp.email == "admin@waterwatch.org"
    assert token_resp.access_token is not None

def test_citizen_authentication(db):
    creds = UserLogin(email="citizen@waterwatch.org", password="Password123!")
    token_resp = auth_service.authenticate_user(db, creds)
    assert token_resp.role == "citizen"

def test_worker_authentication(db):
    creds = UserLogin(email="worker@waterwatch.org", password="Password123!")
    token_resp = auth_service.authenticate_user(db, creds)
    assert token_resp.role == "worker"

def test_citizen_forgot_password_and_reset_flow(db):
    from app.core.exceptions import BadRequestException, ForbiddenException, UnauthorizedException

    # 1. Citizen requests password reset
    res = auth_service.request_password_reset(db, "citizen@waterwatch.org")
    assert res["reset_token"] is not None
    assert res["reset_code"] is not None
    assert "instructions generated" in res["message"]

    reset_token = res["reset_token"]

    # 2. Reset password to new password
    new_pw = "NewCitizenPassword2026!"
    reset_res = auth_service.reset_password(
        db,
        token=reset_token,
        new_password=new_pw,
        confirm_password=new_pw,
        email="citizen@waterwatch.org"
    )
    assert reset_res["success"] is True

    # 3. Authenticate with new password succeeds
    login_success = auth_service.authenticate_user(
        db,
        UserLogin(email="citizen@waterwatch.org", password=new_pw)
    )
    assert login_success.access_token is not None

    # 4. Old password fails
    with pytest.raises(UnauthorizedException):
        auth_service.authenticate_user(
            db,
            UserLogin(email="citizen@waterwatch.org", password="OldPassword123!")
        )

    # 5. Restore original password so other test suites stay green
    restore_res = auth_service.request_password_reset(db, "citizen@waterwatch.org")
    auth_service.reset_password(
        db,
        token=restore_res["reset_token"],
        new_password="Password123!",
        confirm_password="Password123!"
    )

def test_worker_and_admin_forgot_password_and_reset_flow(db):
    # 1. Field Worker password reset flow
    w_res = auth_service.request_password_reset(db, "worker@waterwatch.org")
    assert w_res["reset_token"] is not None
    assert w_res["role"] == "worker"

    new_worker_pw = "NewWorkerPassword2026!"
    w_reset = auth_service.reset_password(
        db,
        token=w_res["reset_token"],
        new_password=new_worker_pw,
        confirm_password=new_worker_pw
    )
    assert w_reset["success"] is True

    # Worker can log in with new password
    w_auth = auth_service.authenticate_user(
        db,
        UserLogin(email="worker@waterwatch.org", password=new_worker_pw)
    )
    assert w_auth.role == "worker"

    # Restore worker password
    w_restore = auth_service.request_password_reset(db, "worker@waterwatch.org")
    auth_service.reset_password(
        db,
        token=w_restore["reset_token"],
        new_password="Password123!",
        confirm_password="Password123!"
    )

    # 2. Administrator password reset flow
    a_res = auth_service.request_password_reset(db, "admin@waterwatch.org")
    assert a_res["reset_token"] is not None
    assert a_res["role"] == "admin"

    new_admin_pw = "NewAdminPassword2026!"
    a_reset = auth_service.reset_password(
        db,
        token=a_res["reset_token"],
        new_password=new_admin_pw,
        confirm_password=new_admin_pw
    )
    assert a_reset["success"] is True

    # Admin can log in with new password
    a_auth = auth_service.authenticate_user(
        db,
        UserLogin(email="admin@waterwatch.org", password=new_admin_pw)
    )
    assert a_auth.role == "admin"

    # Restore admin password
    a_restore = auth_service.request_password_reset(db, "admin@waterwatch.org")
    auth_service.reset_password(
        db,
        token=a_restore["reset_token"],
        new_password="Password123!",
        confirm_password="Password123!"
    )

def test_forgot_password_validation_errors(db):
    from app.core.exceptions import BadRequestException, UnauthorizedException

    # Non-existent user
    with pytest.raises(BadRequestException):
        auth_service.request_password_reset(db, "nonexistent_citizen_12345@example.com")

    # Passwords do not match
    valid_res = auth_service.request_password_reset(db, "citizen@waterwatch.org")
    with pytest.raises(BadRequestException) as exc_info:
        auth_service.reset_password(
            db,
            token=valid_res["reset_token"],
            new_password="ValidPassword123!",
            confirm_password="DifferentPassword456!"
        )
    assert "do not match" in str(exc_info.value)

    # Password too short (<8 chars)
    with pytest.raises(BadRequestException) as exc_info:
        auth_service.reset_password(
            db,
            token=valid_res["reset_token"],
            new_password="short",
            confirm_password="short"
        )
    assert "8 characters" in str(exc_info.value)

    # Invalid / forged token
    with pytest.raises(UnauthorizedException):
        auth_service.reset_password(
            db,
            token="invalid-tampered-token",
            new_password="ValidPassword123!",
            confirm_password="ValidPassword123!"
        )


