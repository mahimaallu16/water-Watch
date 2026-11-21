import os
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
import jwt
import bcrypt

# Attempt to import argon2-cffi if installed
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError
    _hasher = PasswordHasher()
    HAS_ARGON2 = True
except ImportError:
    HAS_ARGON2 = False
    _hasher = None

from app.config import settings

def hash_password(password: str) -> str:
    """
    Hashes password using Argon2id when available, with secure bcrypt fallback.
    """
    if HAS_ARGON2 and _hasher:
        try:
            return _hasher.hash(password)
        except Exception:
            pass
    # Fallback to standard bcrypt
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against an Argon2id or bcrypt hash.
    """
    if not hashed_password or not plain_password:
        return False
        
    # Check if hash is Argon2 format
    if hashed_password.startswith("$argon2"):
        if HAS_ARGON2 and _hasher:
            try:
                return _hasher.verify(hashed_password, plain_password)
            except Exception:
                return False
        else:
            # If argon2 is not installed in current env, attempt fallback check
            return False
            
    # Bcrypt format
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def create_password_reset_token(email: str, user_id: str, role: str = "citizen", expires_minutes: int = 15) -> str:
    """
    Creates a time-limited, signed token specifically for password reset operations.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode = {
        "sub": str(user_id),
        "email": str(email).lower(),
        "role": str(role).lower(),
        "type": "password_reset",
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_password_reset_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a password reset token, verifying expiry and token type.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload
    except jwt.PyJWTError:
        return None


