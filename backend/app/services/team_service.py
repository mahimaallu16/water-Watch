"""
Team and Field Crew Management Service.
Coordinates municipal maintenance units, zones, and worker registrations.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User, WorkerProfile
from app.models.assignment import Assignment
from app.schemas.team import TeamCreate, TeamOut, TeamMemberOut, WorkerRegisterByAdmin
from app.services.auth_service import auth_service
from app.schemas.user import UserRegister
from app.core.exceptions import BadRequestException, ConflictException
from app.services.audit_service import audit_service

# In-memory storage of custom team configurations if extended beyond standard zones
_MUNICIPAL_TEAMS: Dict[str, Dict[str, Any]] = {
    "TEAM-CENTRAL": {
        "id": "TEAM-CENTRAL",
        "name": "Central Rapid Response Team",
        "zone": "Central",
        "department": "Water Operations",
        "specialization": "Mainline Pipe Repairs",
        "description": "Primary emergency leak and valve repair crew for the central municipal grid."
    },
    "TEAM-NORTH": {
        "id": "TEAM-NORTH",
        "name": "North Infrastructure Crew",
        "zone": "North",
        "department": "Water Distribution",
        "specialization": "Hydrant & Valve Maintenance",
        "description": "Northern zone water infrastructure maintenance and inspection unit."
    },
    "TEAM-EAST": {
        "id": "TEAM-EAST",
        "name": "East District Water Unit",
        "zone": "East",
        "department": "Water Operations",
        "specialization": "Pressure Regulators & Metering",
        "description": "Eastern residential and commercial sector pipeline unit."
    },
    "TEAM-SOUTH": {
        "id": "TEAM-SOUTH",
        "name": "South Heavy Maintenance Crew",
        "zone": "South",
        "department": "Heavy Utilities",
        "specialization": "Excavation & Major Main Bursts",
        "description": "Southern sector heavy repairs, road cutting, and main replacement."
    },
    "TEAM-WEST": {
        "id": "TEAM-WEST",
        "name": "West Catchment & Distribution Crew",
        "zone": "West",
        "department": "Water Distribution",
        "specialization": "Reservoirs & Overflow Control",
        "description": "Western distribution lines and reservoir overflow monitoring."
    }
}

class TeamService:
    @staticmethod
    def list_teams(db: Session) -> List[dict]:
        """Lists all municipal teams with their registered worker members and active workloads."""
        teams = list(_MUNICIPAL_TEAMS.values())
        workers = db.query(User).filter(User.role == "worker", User.is_active == True).all()

        results = []
        for t in teams:
            team_zone = t["zone"].lower()
            team_members = []
            for w in workers:
                w_zone = (w.worker_profile.zone if w.worker_profile else "").lower()
                if w_zone == team_zone:
                    active_tasks = db.query(Assignment).filter(
                        Assignment.worker_id == w.id,
                        Assignment.status.in_(["assigned", "accepted", "in_progress", "rework_required"])
                    ).count()
                    team_members.append({
                        "user_id": w.id,
                        "full_name": w.full_name,
                        "employee_id": w.worker_profile.employee_id if w.worker_profile else "EMP-001",
                        "email": w.email,
                        "is_available": w.worker_profile.is_available if w.worker_profile else True,
                        "active_tasks": active_tasks
                    })

            results.append({
                "id": t["id"],
                "name": t["name"],
                "zone": t["zone"],
                "department": t["department"],
                "specialization": t["specialization"],
                "description": t["description"],
                "member_count": len(team_members),
                "members": team_members
            })
        return results

    @staticmethod
    def create_team(db: Session, team_in: TeamCreate, admin: User) -> dict:
        """Administrator: Create a new maintenance team or crew definition."""
        team_id = f"TEAM-{team_in.zone.upper().replace(' ', '_')}"
        if team_id in _MUNICIPAL_TEAMS:
            raise ConflictException(f"Team for zone '{team_in.zone}' already exists")

        new_team = {
            "id": team_id,
            "name": team_in.name,
            "zone": team_in.zone,
            "department": team_in.department or "Water Operations",
            "specialization": team_in.specialization or "General Plumbing",
            "description": team_in.description or f"Operational crew for {team_in.zone}"
        }
        _MUNICIPAL_TEAMS[team_id] = new_team

        audit_service.log_action(
            db=db,
            action="CREATE_TEAM",
            entity_type="team",
            entity_id=team_id,
            user_id=admin.id,
            new_values=new_team
        )
        return {**new_team, "member_count": 0, "members": []}

    @staticmethod
    def register_worker(db: Session, worker_in: WorkerRegisterByAdmin, admin: User) -> User:
        """Administrator: Register a field technician into an operational team and zone."""
        reg_schema = UserRegister(
            email=worker_in.email,
            password=worker_in.password,
            full_name=worker_in.full_name,
            phone=worker_in.phone,
            role="worker",
            employee_id=worker_in.employee_id,
            department=worker_in.department,
            zone=worker_in.zone,
            specialization=worker_in.specialization
        )
        worker = auth_service.register_user(db, reg_schema)

        if worker_in.max_active_tasks and worker.worker_profile:
            worker.worker_profile.max_active_tasks = worker_in.max_active_tasks
            db.commit()
            db.refresh(worker)

        audit_service.log_action(
            db=db,
            action="ADMIN_REGISTER_WORKER",
            entity_type="user",
            entity_id=worker.id,
            user_id=admin.id,
            new_values={
                "worker_name": worker.full_name,
                "email": worker.email,
                "zone": worker_in.zone,
                "employee_id": worker.worker_profile.employee_id if worker.worker_profile else None
            }
        )
        return worker

team_service = TeamService()

