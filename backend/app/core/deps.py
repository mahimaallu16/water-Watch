"""
Core Dependencies Re-export Module.
Maintains backward compatibility with any internal modules importing from app.core.deps.
"""
from app.api.dependencies.auth import (
    oauth2_scheme,
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
    "oauth2_scheme",
    "get_current_user",
    "require_roles",
    "require_admin",
    "require_worker",
    "require_citizen",
    "require_resident",
    "require_admin_or_worker",
    "require_any_authenticated",
]
