"""
Authentication and Role-Based Authorization Dependencies.
Enforces strict server-side permission checks.
Never trusts roles or permissions supplied by the frontend.
"""
from typing import Callable, List, Union
from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts, validates, and decodes the JWT bearer token.
    Loads and verifies the active user account from the database.
    """
    actual_token = token
    if not actual_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            actual_token = parts[1]

    if not actual_token:
        raise UnauthorizedException("Authentication credentials were not provided")
    
    payload = decode_access_token(actual_token)
    if not payload:
        raise UnauthorizedException("Could not validate credentials or token expired")
    
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload: missing subject")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User account not found")
    if not user.is_active:
        raise ForbiddenException("User account has been deactivated")
        
    return user

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """
    Factory creating a role-enforcement dependency.
    Normalizes 'resident' and 'citizen' as interchangeable aliases.
    """
    normalized_allowed = set()
    for r in allowed_roles:
        r_low = r.lower()
        if r_low in ("citizen", "resident"):
            normalized_allowed.add("citizen")
            normalized_allowed.add("resident")
        else:
            normalized_allowed.add(r_low)

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").lower()
        if user_role not in normalized_allowed:
            raise ForbiddenException(
                f"Action requires one of roles: {', '.join(allowed_roles)}. Your role is '{current_user.role}'"
            )
        return current_user
    return role_checker

# Convenience Role Dependencies
require_citizen = require_roles("citizen", "resident")
require_resident = require_roles("citizen", "resident")
require_admin = require_roles("admin")
require_worker = require_roles("worker")
require_admin_or_worker = require_roles("admin", "worker")
require_any_authenticated = get_current_user

