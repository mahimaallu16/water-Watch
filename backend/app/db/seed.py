from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User, Role, CitizenProfile, WorkerProfile
from app.models.report import Report, ReportImage, DuplicateCandidate
from app.models.incident import Incident, ReportIncidentLink
from app.models.assignment import Assignment, RepairUpdate, RepairEvidence
from app.models.ai import AISuggestion
from app.models.notification import Notification
from app.models.audit import StatusHistory, AuditLog
from app.core.security import hash_password

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@waterwatch.org").first():
            print("Database already contains seed data.")
            return

        print("Seeding WaterWatch database...")
        now = datetime.now(timezone.utc)

        # 1. Create Roles
        roles_data = [
            ("citizen", "Citizen / Resident Portal Access", ["report:create", "report:view", "report:evidence"]),
            ("admin", "Full System Administrator", ["all:manage"]),
            ("worker", "Maintenance Field Worker", ["assignment:view", "assignment:update", "evidence:upload"])
        ]
        for name, desc, perms in roles_data:
            role = Role(name=name, description=desc, permissions=perms)
            db.add(role)

        # 2. Create Users
        # Admin
        admin = User(
            email="admin@waterwatch.org",
            password_hash=hash_password("Password123!"),
            full_name="Director David Mitchell",
            phone="+1-555-0199",
            role="admin",
            is_active=True
        )
        db.add(admin)

        # Citizen
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

        # Citizen 2
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

        db.flush()

        # 3. Create Sample Reports
        # Report 1: Burst Main Pipe (Central)
        rep1 = Report(
            citizen_id=citizen.id,
            report_number="REP-2026-0001",
            title="Severe Main Line Water Leak on 5th Avenue",
            category="pipe_leak",
            description="Massive water rupture coming up through asphalt near crosswalk. Water stream is shooting several feet high.",
            estimated_flow="gushing_geyser",
            affected_households=40,
            latitude=12.9718,
            longitude=77.5948,
            address_text="5th Avenue & Market Street, Central Zone",
            landmark="Outside Grand Central Plaza",
            status="linked",
            created_at=now - timedelta(hours=6)
        )
        db.add(rep1)
        db.flush()

        img1 = ReportImage(
            report_id=rep1.id,
            image_url="/uploads/reports/sample_leak_1.jpg",
            file_name="burst_pipe_main.jpg",
            file_size=2048500,
            mime_type="image/jpeg",
            width=1920,
            height=1080,
            is_primary=True,
            created_at=rep1.created_at
        )
        db.add(img1)

        # Report 2: Second resident report for the same rupture (Duplicate Candidate!)
        rep2 = Report(
            citizen_id=citizen2.id,
            report_number="REP-2026-0002",
            title="Broken water pipeline flooding street near Central Plaza",
            category="pipe_leak",
            description="Water is pouring across the road in front of Central Plaza building. Impeding traffic and pedestrians.",
            estimated_flow="heavy_flow",
            affected_households=25,
            latitude=12.9721,
            longitude=77.5950,
            address_text="5th Avenue corner, opposite Metro exit",
            landmark="Near Metro Entrance",
            status="submitted",
            created_at=now - timedelta(hours=4)
        )
        db.add(rep2)
        db.flush()

        img2 = ReportImage(
            report_id=rep2.id,
            image_url="/uploads/reports/sample_leak_2.jpg",
            file_name="street_flooding.jpg",
            file_size=1845200,
            mime_type="image/jpeg",
            width=1600,
            height=1200,
            is_primary=True,
            created_at=rep2.created_at
        )
        db.add(img2)

        # Report 3: Damaged Valve (North Zone)
        rep3 = Report(
            citizen_id=citizen.id,
            report_number="REP-2026-0003",
            title="Leaking pressure control valve chamber",
            category="damaged_valve",
            description="Continuous hissing sound and water spilling out of municipal valve access box on sidewalk.",
            estimated_flow="moderate_stream",
            affected_households=8,
            latitude=12.9880,
            longitude=77.6040,
            address_text="North Park Road, Section 4",
            landmark="Next to North Community Library",
            status="linked",
            created_at=now - timedelta(hours=18)
        )
        db.add(rep3)
        db.flush()

        # Report 4: Discolored murky water
        rep4 = Report(
            citizen_id=citizen2.id,
            report_number="REP-2026-0004",
            title="Muddy brown tap water supply in apartment block",
            category="contamination",
            description="Water from tap has noticeable brownish tint and earthy odor since morning. Residents suspect pipeline infiltration.",
            estimated_flow="moderate_stream",
            affected_households=60,
            latitude=12.9640,
            longitude=77.5850,
            address_text="Westside Heights, Tower B",
            landmark="Westside Junction",
            status="submitted",
            created_at=now - timedelta(hours=2)
        )
        db.add(rep4)
        db.flush()

        # Report 5: Resolved previous report
        rep5 = Report(
            citizen_id=citizen.id,
            report_number="REP-2026-0005",
            title="Dripping fire hydrant joint",
            category="overflow",
            description="Hydrant base joint was leaking small puddle onto curb.",
            estimated_flow="trickle",
            affected_households=2,
            latitude=12.9780,
            longitude=77.5990,
            address_text="77 Elm Street, East Zone",
            landmark="Corner of 3rd cross",
            status="resolved",
            created_at=now - timedelta(days=2)
        )
        db.add(rep5)
        db.flush()

        # 4. Duplicate Candidate Record between REP-2 and REP-1
        dup_candidate = DuplicateCandidate(
            report_id=rep2.id,
            potential_duplicate_report_id=rep1.id,
            similarity_score=0.88,
            distance_meters=42.5,
            time_diff_hours=2.0,
            text_similarity=0.45,
            category_match=True,
            status="detected",
            created_at=rep2.created_at
        )
        db.add(dup_candidate)

        # 5. AI Suggestions
        ai_sugg1 = AISuggestion(
            report_id=rep1.id,
            suggestion_type="priority",
            suggested_value={
                "recommended_severity": "critical",
                "recommended_priority": "p1",
                "urgency_score": 90.0,
                "target_turnaround": "< 4 hours"
            },
            confidence_score=0.92,
            reasoning="Gushing flow rate and 40 affected households on high-traffic transit corridor.",
            review_status="accepted",
            reviewed_by=admin.id,
            reviewed_at=now - timedelta(hours=5)
        )
        db.add(ai_sugg1)

        ai_sugg2 = AISuggestion(
            report_id=rep2.id,
            suggestion_type="duplicate",
            suggested_value={
                "potential_duplicate_id": rep1.id,
                "potential_report_number": "REP-2026-0001",
                "similarity_score": 0.88
            },
            confidence_score=0.88,
            reasoning="Candidate is within 42m of REP-2026-0001 reported 2 hours prior with matching category.",
            review_status="pending"
        )
        db.add(ai_sugg2)

        # 6. Incidents
        # Incident 1: Active Main Line Burst (In Progress)
        inc1 = Incident(
            incident_number="INC-2026-0001",
            title="Critical Main Line Rupture - 5th Avenue",
            category="pipe_leak",
            description="Major pipeline break at 5th & Market St. High-flow gushing water threatening foundation and road bed.",
            severity="critical",
            priority="p1",
            status="in_progress",
            latitude=12.9718,
            longitude=77.5948,
            address_text="5th Avenue & Market Street, Central Zone",
            zone="Central",
            created_by=admin.id,
            target_resolution_at=now + timedelta(hours=3),
            created_at=now - timedelta(hours=5)
        )
        db.add(inc1)
        db.flush()

        # Link rep1 to inc1
        link1 = ReportIncidentLink(
            incident_id=inc1.id,
            report_id=rep1.id,
            linked_by=admin.id,
            notes="Primary citizen notification that triggered the incident",
            linked_at=inc1.created_at
        )
        db.add(link1)

        # Assign Carlos to inc1
        assign1 = Assignment(
            incident_id=inc1.id,
            worker_id=worker1.id,
            assigned_by=admin.id,
            status="in_progress",
            instructions="Isolate section valve 12B immediately, excavate pavement, and clamp 12-inch ductile iron line.",
            priority="p1",
            assigned_at=now - timedelta(hours=4),
            accepted_at=now - timedelta(hours=3, minutes=45)
        )
        db.add(assign1)
        db.flush()

        # Worker update
        upd1 = RepairUpdate(
            assignment_id=assign1.id,
            incident_id=inc1.id,
            worker_id=worker1.id,
            update_type="arrival",
            notes="Arrived on site with crew. Water flow shut off at upstream gate valve 12B. Beginning road surface saw-cutting.",
            timestamp=now - timedelta(hours=3)
        )
        db.add(upd1)

        # Before evidence image
        ev1 = RepairEvidence(
            assignment_id=assign1.id,
            incident_id=inc1.id,
            worker_id=worker1.id,
            evidence_type="before",
            image_url="/uploads/evidence/sample_before_repair.jpg",
            notes="Before repair: 6-inch crack visible on ductile iron pipe wall.",
            materials_used="Traffic cones, excavation trench box",
            uploaded_at=now - timedelta(hours=2, minutes=30)
        )
        db.add(ev1)

        # Incident 2: Damaged Valve (Assigned to Elena)
        inc2 = Incident(
            incident_number="INC-2026-0002",
            title="Pressure Regulator Valve Replacement",
            category="damaged_valve",
            description="Leaking pressure control valve chamber on North Park Road.",
            severity="medium",
            priority="p2",
            status="assigned",
            latitude=12.9880,
            longitude=77.6040,
            address_text="North Park Road, Section 4",
            zone="North",
            created_by=admin.id,
            target_resolution_at=now + timedelta(hours=12),
            created_at=now - timedelta(hours=14)
        )
        db.add(inc2)
        db.flush()

        link2 = ReportIncidentLink(
            incident_id=inc2.id,
            report_id=rep3.id,
            linked_by=admin.id,
            notes="Linked from resident report REP-2026-0003",
            linked_at=inc2.created_at
        )
        db.add(link2)

        assign2 = Assignment(
            incident_id=inc2.id,
            worker_id=worker2.id,
            assigned_by=admin.id,
            status="assigned",
            instructions="Inspect chamber gasket and seat seal. Replace 4-inch valve assembly if cracked.",
            priority="p2",
            assigned_at=now - timedelta(hours=10)
        )
        db.add(assign2)

        # Incident 3: Resolved Incident (Historical verified)
        inc3 = Incident(
            incident_number="INC-2026-0003",
            title="Hydrant Gasket Replacement - Elm St",
            category="overflow",
            description="Dripping fire hydrant repaired and tested.",
            severity="low",
            priority="p4",
            status="resolved",
            latitude=12.9780,
            longitude=77.5990,
            address_text="77 Elm Street, East Zone",
            zone="East",
            created_by=admin.id,
            resolved_at=now - timedelta(days=1),
            created_at=now - timedelta(days=2)
        )
        db.add(inc3)
        db.flush()

        link3 = ReportIncidentLink(
            incident_id=inc3.id,
            report_id=rep5.id,
            linked_by=admin.id,
            notes="Linked from REP-2026-0005",
            linked_at=inc3.created_at
        )
        db.add(link3)

        # 7. Notifications
        notif_citizen = Notification(
            user_id=citizen.id,
            title="Technician Dispatched for Incident INC-2026-0001",
            message="Senior technician Carlos Mendez is on site working on your reported water leak on 5th Avenue.",
            notification_type="status_update",
            related_entity_type="incident",
            related_entity_id=inc1.id,
            is_read=False,
            created_at=now - timedelta(hours=3)
        )
        db.add(notif_citizen)

        notif_admin = Notification(
            user_id=admin.id,
            title="Potential Duplicate Report Detected",
            message="Report REP-2026-0002 has high similarity (88%) to active incident INC-2026-0001.",
            notification_type="duplicate_alert",
            related_entity_type="report",
            related_entity_id=rep2.id,
            is_read=False,
            created_at=now - timedelta(hours=4)
        )
        db.add(notif_admin)

        notif_worker = Notification(
            user_id=worker1.id,
            title="New Urgent Assignment: INC-2026-0001",
            message="You have been assigned to Priority P1 incident on 5th Avenue.",
            notification_type="assignment",
            related_entity_type="incident",
            related_entity_id=inc1.id,
            is_read=True,
            created_at=now - timedelta(hours=4)
        )
        db.add(notif_worker)

        # 8. Status Histories
        sh1 = StatusHistory(
            entity_type="incident",
            entity_id=inc1.id,
            previous_status=None,
            new_status="investigating",
            changed_by=admin.id,
            notes="Incident created by Director Mitchell",
            created_at=inc1.created_at
        )
        db.add(sh1)

        sh2 = StatusHistory(
            entity_type="incident",
            entity_id=inc1.id,
            previous_status="investigating",
            new_status="assigned",
            changed_by=admin.id,
            notes="Assigned to Carlos Mendez",
            created_at=assign1.assigned_at
        )
        db.add(sh2)

        sh3 = StatusHistory(
            entity_type="incident",
            entity_id=inc1.id,
            previous_status="assigned",
            new_status="in_progress",
            changed_by=worker1.id,
            notes="Crew arrived on site and secured perimeter",
            created_at=assign1.accepted_at
        )
        db.add(sh3)

        # 9. Audit Logs
        al1 = AuditLog(
            user_id=admin.id,
            action="CREATE_INCIDENT",
            entity_type="incident",
            entity_id=inc1.id,
            new_values={"incident_number": inc1.incident_number, "severity": "critical"}
        )
        db.add(al1)

        db.commit()
        print("Seed data successfully created!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()

