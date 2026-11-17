from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User, Role, CitizenProfile, WorkerProfile
from app.core.security import hash_password

def seed_database(db: Session = None):
    """
    Initializes core system roles and authorized administrative/worker accounts.
    Keeps the incident and complaints queue completely clean for real user submissions.
    """
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@waterwatch.org").first():
            return

        print("Initializing WaterWatch database roles and authorized accounts...")

        # 1. Create Roles
        roles_data = [
            ("citizen", "Citizen / Resident Portal Access", ["report:create", "report:view", "report:evidence"]),
            ("admin", "Full System Administrator", ["all:manage"]),
            ("worker", "Maintenance Field Worker", ["assignment:view", "assignment:update", "evidence:upload"])
        ]
        for name, desc, perms in roles_data:
            existing_role = db.query(Role).filter(Role.name == name).first()
            if not existing_role:
                role = Role(name=name, description=desc, permissions=perms)
                db.add(role)

        # 2. Create Users
        # Administrator
        admin = User(
            email="admin@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Director David Mitchell",
            phone="+1-555-0199",
            role="admin",
            is_active=True
        )
        db.add(admin)

        # Citizen / Resident 1
        citizen = User(
            email="citizen@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Sarah Jenkins",
            phone="+1-555-0144",
            role="citizen",
            is_active=True
        )
        db.add(citizen)
        db.flush()

        citizen_prof = CitizenProfile(
            user_id=citizen.id,
            address="45 Maple Avenue, Downtown Central",
            latitude=12.9716,
            longitude=77.5946,
            preferred_radius_km=5.0
        )
        db.add(citizen_prof)

        # Citizen / Resident 2
        citizen2 = User(
            email="citizen2@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Marcus Vance",
            phone="+1-555-0182",
            role="citizen",
            is_active=True
        )
        db.add(citizen2)
        db.flush()

        citizen_prof2 = CitizenProfile(
            user_id=citizen2.id,
            address="12 Oakwood Boulevard",
            latitude=12.9722,
            longitude=77.5951,
            preferred_radius_km=5.0
        )
        db.add(citizen_prof2)

        # Field Worker 1 (Carlos - Central / Main Line)
        worker1 = User(
            email="worker@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Carlos Mendez",
            phone="+1-555-0177",
            role="worker",
            is_active=True
        )
        db.add(worker1)
        db.flush()

        w_prof1 = WorkerProfile(
            user_id=worker1.id,
            employee_id="WKR-1001",
            department="Rapid Response Maintenance",
            zone="Central",
            specialization="Main Line Repair",
            max_active_tasks=5,
            is_available=True,
            current_latitude=12.9725,
            current_longitude=77.5960
        )
        db.add(w_prof1)

        # Field Worker 2 (Elena - North / Valve Specialist)
        worker2 = User(
            email="worker2@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Elena Rostova",
            phone="+1-555-0133",
            role="worker",
            is_active=True
        )
        db.add(worker2)
        db.flush()

        w_prof2 = WorkerProfile(
            user_id=worker2.id,
            employee_id="WKR-1002",
            department="Infrastructure Operations",
            zone="North",
            specialization="Valve Specialist",
            max_active_tasks=5,
            is_available=True,
            current_latitude=12.9850,
            current_longitude=77.6050
        )
        db.add(w_prof2)

        # Commit authorized roles and users without any default complaints/incidents
        db.commit()
        print("WaterWatch database initialized successfully with clean complaint queues.")

    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
