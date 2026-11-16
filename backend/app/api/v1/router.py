from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    reports,
    incidents,
    assignments,
    workers,
    teams,
    ai,
    notifications,
    analytics,
    audit
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(reports.router)
api_router.include_router(incidents.router)
api_router.include_router(assignments.router)
api_router.include_router(workers.router)
api_router.include_router(teams.router)
api_router.include_router(ai.router)
api_router.include_router(notifications.router)
api_router.include_router(analytics.router)
api_router.include_router(audit.router)
