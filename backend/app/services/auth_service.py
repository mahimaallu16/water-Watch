from datetime import timedelta, datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User, CitizenProfile, WorkerProfile, Role
from app.schemas.user import UserRegister, UserLogin, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import BadRequestException, UnauthorizedException, ConflictException, ForbiddenException
from app.services.audit_service import audit_service
from app.repositories.user_repository import user_repository

class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserRegister) -> User:
        # Check password complexity: Minimum 8 characters
        if not user_in.password or len(user_in.password) < 8:
            raise BadRequestException("Password must be at least 8 characters long for security.")

        # Check if email is already registered
        existing = user_repository.get_by_email(db, user_in.email)
        if existing:
            raise ConflictException(f"User with email '{user_in.email}' already exists.")

        # Normalize role: accept 'resident' or 'citizen' as resident role
        raw_role = (user_in.role or "citizen").strip().lower()
        if raw_role in ("citizen", "resident"):
            role = "citizen"
        elif raw_role in ("admin", "worker"):
            # Prevent unauthorized public escalation to admin/worker
            raise BadRequestException(
                "Public self-registration is only available for Residents. "
                "Maintenance Worker and Administrator accounts must be provisioned through management."
            )
        else:
            raise BadRequestException("Invalid role. Must be 'resident' or 'citizen'.")

        user = User(
            email=user_in.email.strip().lower(),
            password_hash=hash_password(user_in.password),
            full_name=user_in.full_name.strip(),
            phone=user_in.phone.strip() if user_in.phone else None,
            role=role,
            is_active=True
        )
        db.add(user)
        db.flush()

        # Create citizen / resident profile
        profile = CitizenProfile(
            user_id=user.id,
            address=user_in.address,
            latitude=user_in.latitude,
            longitude=user_in.longitude
        )
        db.add(profile)

        db.commit()
        db.refresh(user)

        audit_service.log_action(
            db=db,
            action="USER_REGISTERED",
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            new_values={"email": user.email, "role": user.role}
        )

        return user

    @staticmethod
    def authenticate_user(db: Session, creds: UserLogin) -> Token:
        user = user_repository.get_by_email(db, creds.email)
        if not user or not verify_password(creds.password, user.password_hash):
            raise UnauthorizedException("Incorrect email or password")
        
        if not user.is_active:
            raise UnauthorizedException("User account is inactive. Please contact support.")

        token = create_access_token(subject=user.id, role=user.role)
        return Token(
            access_token=token,
            token_type="bearer",
            role=user.role,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email
        )

    @staticmethod
    def logout_user(db: Session, user: User) -> dict:
        audit_service.log_action(
            db=db,
            action="USER_LOGOUT",
            entity_type="user",
            entity_id=user.id,
            user_id=user.id
        )
        return {"message": "Successfully logged out. Client token invalidated.", "status": "logged_out"}

auth_service = AuthService()
