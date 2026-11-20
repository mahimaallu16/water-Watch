from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, Token, UserOut, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest
from app.schemas.common import MessageResponse
from app.services.auth_service import auth_service
from app.api.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (Resident, Worker, or Administrator)."""
    user = auth_service.register_user(db, user_in)
    return user

@router.post("/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive a JWT access token."""
    token = auth_service.authenticate_user(db, creds)
    return token

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token for a citizen resident account."""
    return auth_service.request_password_reset(db, req.email)

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset citizen password using the issued reset token."""
    result = auth_service.reset_password(
        db,
        token=req.token,
        new_password=req.new_password,
        confirm_password=req.confirm_password,
        email=req.email
    )
    return MessageResponse(message=result["message"], success=True)


@router.post("/logout", response_model=dict)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout current user and invalidate session/token on client."""
    return auth_service.logout_user(db, current_user)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile and role details."""
    return current_user
