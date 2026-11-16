from typing import Optional, List
from pydantic import BaseModel, EmailStr

class TeamCreate(BaseModel):
    name: str
    zone: str
    department: Optional[str] = "Water Operations"
    specialization: Optional[str] = "General Plumbing"
    description: Optional[str] = None

class TeamMemberOut(BaseModel):
    user_id: str
    full_name: str
    employee_id: str
    email: str
    is_available: bool
    active_tasks: int

class TeamOut(BaseModel):
    id: str
    name: str
    zone: str
    department: str
    specialization: str
    description: Optional[str] = None
    member_count: int = 0
    members: List[TeamMemberOut] = []

class WorkerRegisterByAdmin(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = "Water Operations"
    zone: Optional[str] = "Central"
    specialization: Optional[str] = "General Plumbing"
    max_active_tasks: Optional[int] = 5

