from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class StatusHistoryOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    previous_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

