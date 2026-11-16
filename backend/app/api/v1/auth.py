from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, Token, UserOut
from app.services.auth_service import auth_service
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (Citizen, Worker, or Administrator)."""
    user = auth_service.register_user(db, user_in)
    return user

@router.post("/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and receive a JWT access token."""
    token = auth_service.authenticate_user(db, creds)
    return token

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile and role details."""
    return current_user

