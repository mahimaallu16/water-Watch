from typing import Generator, List, Callable
from fastapi import Depends, Header, HTTPException, status
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
        raise UnauthorizedException("Invalid token payload")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User not found")
    if not user.is_active:
        raise ForbiddenException("User account is inactive")
        
    return user

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(f"Action requires one of roles: {', '.join(allowed_roles)}. Your role is '{current_user.role}'")
        return current_user
    return role_checker

# Convenience dependencies
require_citizen = require_roles("citizen")
require_admin = require_roles("admin")
require_worker = require_roles("worker")
require_admin_or_worker = require_roles("admin", "worker")
require_any_authenticated = get_current_user

