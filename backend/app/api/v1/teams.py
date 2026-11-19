from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.team import TeamCreate, TeamOut
from app.services.team_service import team_service
from app.api.dependencies.auth import require_admin, require_any_authenticated
from app.models.user import User

router = APIRouter(prefix="/teams", tags=["Maintenance Teams"])

@router.get("/", response_model=List[TeamOut])
def list_teams(
    current_user: User = Depends(require_any_authenticated),
    db: Session = Depends(get_db)
):
    """List municipal maintenance teams, operational zones, and current active crew assignments."""
    return team_service.list_teams(db)

@router.post("/", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: TeamCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Administrator: Create an operational maintenance team definition."""
    return team_service.create_team(db, team_in, current_user)

