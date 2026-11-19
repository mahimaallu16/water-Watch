"""
API Dependencies Package.
"""
from app.api.dependencies.auth import (
    get_current_user,
    require_roles,
    require_admin,
    require_worker,
    require_citizen,
    require_resident,
    require_admin_or_worker,
    require_any_authenticated,
)

__all__ = [
    "get_current_user",
    "require_roles",
    "require_admin",
    "require_worker",
    "require_citizen",
    "require_resident",
    "require_admin_or_worker",
    "require_any_authenticated",
]

