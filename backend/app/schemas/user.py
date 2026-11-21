from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "citizen" # citizen, worker, admin
    
    # Optional citizen profile fields
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Optional worker profile fields
    employee_id: Optional[str] = None
    department: Optional[str] = "Water Operations"
    zone: Optional[str] = "Central"
    specialization: Optional[str] = "General Plumbing"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None
    reset_code: Optional[str] = None
    role: Optional[str] = None
    expires_in_minutes: int = 15

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    email: Optional[EmailStr] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    email: str

class CitizenProfileOut(BaseModel):
    id: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_radius_km: float = 5.0
    notify_email: bool = True
    notify_in_app: bool = True

    class Config:
        from_attributes = True

class WorkerProfileOut(BaseModel):
    id: str
    employee_id: str
    department: str
    zone: str
    specialization: str
    max_active_tasks: int
    is_available: bool
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    citizen_profile: Optional[CitizenProfileOut] = None
    worker_profile: Optional[WorkerProfileOut] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_radius_km: Optional[float] = None
    notify_email: Optional[bool] = None
    notify_in_app: Optional[bool] = None

class WorkerUpdate(BaseModel):
    zone: Optional[str] = None
    specialization: Optional[str] = None
    max_active_tasks: Optional[int] = None
    is_available: Optional[bool] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

