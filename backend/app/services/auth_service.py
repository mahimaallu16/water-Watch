from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.user import User, CitizenProfile, WorkerProfile, Role
from app.schemas.user import UserRegister, UserLogin, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import BadRequestException, UnauthorizedException, ConflictException
from app.services.audit_service import audit_service

class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserRegister) -> User:
        # Check if email is already in use
        existing = db.query(User).filter(User.email == user_in.email.lower()).first()
        if existing:
            raise ConflictException(f"User with email '{user_in.email}' already exists")

        # Normalize role
        role = user_in.role.lower()
        if role not in ("citizen", "admin", "worker"):
            raise BadRequestException("Invalid role. Must be 'citizen', 'admin', or 'worker'.")

        user = User(
            email=user_in.email.lower(),
            password_hash=hash_password(user_in.password),
            full_name=user_in.full_name,
            phone=user_in.phone,
            role=role,
            is_active=True
        )
        db.add(user)
        db.flush()

        # Create role profile
        if role == "citizen":
            profile = CitizenProfile(
                user_id=user.id,
                address=user_in.address,
                latitude=user_in.latitude,
                longitude=user_in.longitude
            )
            db.add(profile)
        elif role == "worker":
            # Auto-generate employee id if not provided
            emp_id = user_in.employee_id or f"WKR-{user.id[:8].upper()}"
            profile = WorkerProfile(
                user_id=user.id,
                employee_id=emp_id,
                department=user_in.department or "Water Operations",
                zone=user_in.zone or "Central",
                specialization=user_in.specialization or "General Plumbing",
                max_active_tasks=5,
                is_available=True
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
        user = db.query(User).filter(User.email == creds.email.lower()).first()
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

auth_service = AuthService()

