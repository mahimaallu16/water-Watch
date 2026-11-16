"""
User and Profile Data Repository.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.user import User, CitizenProfile, WorkerProfile

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.strip().lower()).first()

    def list_workers(
        self,
        db: Session,
        zone: Optional[str] = None,
        available_only: bool = False
    ) -> List[User]:
        q = db.query(User).filter(User.role == "worker", User.is_active == True)
        workers = q.all()
        if zone or available_only:
            filtered = []
            for w in workers:
                if not w.worker_profile:
                    continue
                if zone and w.worker_profile.zone.lower() != zone.lower():
                    continue
                if available_only and not w.worker_profile.is_available:
                    continue
                filtered.append(w)
            return filtered
        return workers

user_repository = UserRepository()

