from datetime import timedelta, datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User, CitizenProfile, WorkerProfile, Role
from app.schemas.user import UserRegister, UserLogin, Token
from app.core.security import hash_password, verify_password, create_access_token, create_password_reset_token, decode_password_reset_token
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

    @staticmethod
    def request_password_reset(db: Session, email: str) -> dict:
        clean_email = (email or "").strip().lower()
        if not clean_email:
            raise BadRequestException("Email address is required.")

        user = user_repository.get_by_email(db, clean_email)
        if not user:
            raise BadRequestException(f"No account found with email '{clean_email}'.")

        user_role = (user.role or "").lower()
        if user_role not in ("citizen", "resident"):
            raise ForbiddenException(
                "Self-service password recovery is exclusively available for Citizen/Resident accounts. "
                "Field workers and administrators must contact their municipal supervisor."
            )

        if not user.is_active:
            raise BadRequestException("This account is currently inactive. Please contact municipal support.")

        reset_token = create_password_reset_token(email=user.email, user_id=user.id, expires_minutes=15)
        # Generate a human-readable 6-digit verification code
        reset_code = f"{(abs(hash(user.id + user.email + datetime.now(timezone.utc).strftime('%Y%m%d%H'))) % 900000 + 100000):06d}"

        audit_service.log_action(
            db=db,
            action="PASSWORD_RESET_REQUESTED",
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            new_values={"email": user.email}
        )

        return {
            "message": f"Password reset instructions generated for {user.email}. Set your new password within 15 minutes.",
            "reset_token": reset_token,
            "reset_code": reset_code,
            "expires_in_minutes": 15
        }

    @staticmethod
    def reset_password(
        db: Session,
        token: str,
        new_password: str,
        confirm_password: str,
        email: Optional[str] = None
    ) -> dict:
        if not token or not token.strip():
            raise BadRequestException("Password reset token is required.")

        if not new_password or len(new_password) < 8:
            raise BadRequestException("New password must be at least 8 characters long for security.")

        if new_password != confirm_password:
            raise BadRequestException("New password and confirm password do not match.")

        payload = decode_password_reset_token(token.strip())
        if not payload:
            raise UnauthorizedException("Password reset token is invalid or has expired. Please request a new one.")

        user_id = payload.get("sub")
        user = user_repository.get(db, user_id)
        if not user:
            raise BadRequestException("User associated with this reset token could not be found.")

        user_role = (user.role or "").lower()
        if user_role not in ("citizen", "resident"):
            raise ForbiddenException("Self-service password reset is only permitted for Citizens/Residents.")

        if not user.is_active:
            raise BadRequestException("Account is currently inactive. Please contact support.")

        user.password_hash = hash_password(new_password)
        db.commit()
        db.refresh(user)

        audit_service.log_action(
            db=db,
            action="PASSWORD_RESET_COMPLETED",
            entity_type="user",
            entity_id=user.id,
            user_id=user.id,
            new_values={"email": user.email}
        )

        try:
            from app.services.notification_service import notification_service
            notification_service.create_notification(
                db=db,
                user_id=user.id,
                title="Password Successfully Updated",
                message="Your WaterWatch account password was recently changed. If you did not make this change, contact municipal operations immediately.",
                type="security"
            )
        except Exception:
            pass

        return {
            "message": "Your password has been successfully reset. You may now log in with your new credentials.",
            "success": True
        }


auth_service = AuthService()
