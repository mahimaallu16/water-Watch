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

