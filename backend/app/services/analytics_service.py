from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.report import Report, DuplicateCandidate
from app.models.incident import Incident, ReportIncidentLink
from app.models.assignment import Assignment
from app.models.user import User, WorkerProfile
from app.models.audit import AuditLog

class AnalyticsService:
    @staticmethod
    def get_dashboard_kpis(db: Session) -> Dict[str, Any]:
        total_reports = db.query(Report).count()
        pending_reviews = db.query(Report).filter(Report.status.in_(["submitted", "under_review"])).count()
        
        # Explicit incident status counts as required by Section 14
        open_incidents = db.query(Incident).filter(Incident.status == "investigating").count()
        verified_incidents = db.query(ReportIncidentLink).count() # reports linked / verified
        assigned_incidents = db.query(Incident).filter(Incident.status == "assigned").count()
        in_progress_incidents = db.query(Incident).filter(Incident.status == "in_progress").count()
        pending_verification = db.query(Incident).filter(Incident.status == "work_submitted").count()
        resolved_incidents = db.query(Incident).filter(Incident.status.in_(["resolved", "closed"])).count()
        
        active_incidents = db.query(Incident).filter(
            Incident.status.in_(["investigating", "assigned", "in_progress", "work_submitted"])
        ).count()
        
        critical_incidents = db.query(Incident).filter(
            Incident.severity == "critical",
            Incident.status.in_(["investigating", "assigned", "in_progress", "work_submitted"])
        ).count()
        
        duplicate_candidates_count = db.query(DuplicateCandidate).filter(DuplicateCandidate.status == "detected").count()

        # Average resolution hours for resolved incidents
        resolved_cases = db.query(Incident).filter(
            Incident.status.in_(["resolved", "closed"]),
            Incident.resolved_at != None
        ).all()
        
        avg_res_hours = 0.0
        if resolved_cases:
            valid_durations = [
                (inc.resolved_at - inc.created_at).total_seconds()
                for inc in resolved_cases
                if inc.resolved_at and inc.created_at and inc.resolved_at > inc.created_at
            ]
            if valid_durations:
                avg_res_hours = round(sum(valid_durations) / (len(valid_durations) * 3600.0), 1)

        # Reports by Category
        cat_counts = db.query(Report.category, func.count(Report.id)).group_by(Report.category).all()
        reports_by_category = []
        for cat, cnt in cat_counts:
            pct = round((cnt / max(1, total_reports)) * 100.0, 1)
            reports_by_category.append({
                "category": cat,
                "count": cnt,
                "percentage": pct
            })

        # Reports by Status
        status_counts = db.query(Report.status, func.count(Report.id)).group_by(Report.status).all()
        reports_by_status = [{"status": st, "count": cnt} for st, cnt in status_counts]

        # Incidents by Severity
        total_inc = max(1, db.query(Incident).count())
        sev_counts = db.query(Incident.severity, func.count(Incident.id)).group_by(Incident.severity).all()
        incidents_by_severity = [{
            "severity": sev,
            "count": cnt,
            "percentage": round((cnt / total_inc) * 100.0, 1)
        } for sev, cnt in sev_counts]

        # Incidents by Zone
        zone_counts = db.query(Incident.zone, func.count(Incident.id)).group_by(Incident.zone).all()
        incidents_by_zone = []
        for z, cnt in zone_counts:
            resolved_in_zone = db.query(Incident).filter(
                Incident.zone == z,
                Incident.status.in_(["resolved", "closed"])
            ).count()
            incidents_by_zone.append({
                "zone": z,
                "incident_count": cnt,
                "resolved_count": resolved_in_zone
            })

        # Trends: daily counts for the last 14 days (Recharts format)
        now = datetime.now(timezone.utc)
        trends = []
        for i in range(13, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_str = day_start.strftime("%b %d")

            rep_count = db.query(Report).filter(
                Report.created_at >= day_start,
                Report.created_at < day_end
            ).count()

            res_count = db.query(Incident).filter(
                Incident.resolved_at >= day_start,
                Incident.resolved_at < day_end
            ).count()

            trends.append({
                "date": day_str,
                "reports_count": rep_count,
                "resolved_count": res_count
            })

        # Recent Activity Logs (top 10)
        recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
        recent_activity = []
        for l in recent_logs:
            actor = l.user.full_name if l.user else "System AI"
            recent_activity.append({
                "id": l.id,
                "actor": actor,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "timestamp": l.created_at
            })

        return {
            "total_reports": total_reports,
            "pending_reviews": pending_reviews,
            "active_incidents": active_incidents,
            "open_incidents": open_incidents,
            "verified_incidents": verified_incidents,
            "assigned_incidents": assigned_incidents,
            "in_progress_incidents": in_progress_incidents,
            "pending_verification": pending_verification,
            "resolved_incidents": resolved_incidents,
            "average_resolution_hours": avg_res_hours,
            "critical_incidents": critical_incidents,
            "duplicate_candidates_count": duplicate_candidates_count,
            "reports_by_category": reports_by_category,
            "reports_by_status": reports_by_status,
            "incidents_by_severity": incidents_by_severity,
            "incidents_by_zone": incidents_by_zone,
            "trends": trends,
            "recent_activity": recent_activity
        }

    @staticmethod
    def get_monthly_statistics(db: Session) -> List[Dict[str, Any]]:
        """Monthly report submissions and resolution counts for the past 6 months."""
        now = datetime.now(timezone.utc)
        monthly_stats = []
        for i in range(5, -1, -1):
            # Approximate months
            m_start = (now - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i > 0:
                m_end = (now - timedelta(days=(i - 1) * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                m_end = now + timedelta(days=1)

            month_label = m_start.strftime("%b %Y")
            reps = db.query(Report).filter(Report.created_at >= m_start, Report.created_at < m_end).count()
            res = db.query(Incident).filter(Incident.resolved_at >= m_start, Incident.resolved_at < m_end).count()

            monthly_stats.append({
                "month": month_label,
                "reports_count": reps,
                "resolved_count": res
            })
        return monthly_stats

    @staticmethod
    def get_geographic_summaries(db: Session) -> List[Dict[str, Any]]:
        """Geographic incident breakdown with coordinates and counts per municipal zone."""
        zones = ["Central", "North", "East", "South", "West"]
        summaries = []
        for z in zones:
            incidents_in_zone = db.query(Incident).filter(Incident.zone == z).all()
            total_inc = len(incidents_in_zone)
            open_inc = sum(1 for inc in incidents_in_zone if inc.status == "investigating")
            assigned_inc = sum(1 for inc in incidents_in_zone if inc.status == "assigned")
            in_prog_inc = sum(1 for inc in incidents_in_zone if inc.status == "in_progress")
            pending_verif = sum(1 for inc in incidents_in_zone if inc.status == "work_submitted")
            resolved_inc = sum(1 for inc in incidents_in_zone if inc.status in ("resolved", "closed"))

            avg_lat = None
            avg_lon = None
            if incidents_in_zone:
                avg_lat = round(sum(inc.latitude for inc in incidents_in_zone) / total_inc, 5)
                avg_lon = round(sum(inc.longitude for inc in incidents_in_zone) / total_inc, 5)

            summaries.append({
                "zone": z,
                "total_incidents": total_inc,
                "open_incidents": open_inc,
                "assigned_incidents": assigned_inc,
                "in_progress_incidents": in_prog_inc,
                "pending_verification_incidents": pending_verif,
                "resolved_incidents": resolved_inc,
                "avg_latitude": avg_lat,
                "avg_longitude": avg_lon
            })
        return summaries

    @staticmethod
    def get_worker_performance_metrics(db: Session) -> List[Dict[str, Any]]:
        workers = db.query(User).filter(User.role == "worker", User.is_active == True).all()
        metrics = []

        for w in workers:
            completed_assignments = db.query(Assignment).filter(
                Assignment.worker_id == w.id,
                Assignment.status == "completed"
            ).all()

            active_count = db.query(Assignment).filter(
                Assignment.worker_id == w.id,
                Assignment.status.in_(["assigned", "accepted", "in_progress", "rework_required"])
            ).count()

            res_hours = 0.0
            if completed_assignments:
                total_hours = sum(
                    (a.completed_at - a.assigned_at).total_seconds() / 3600.0
                    for a in completed_assignments
                    if a.completed_at and a.assigned_at and a.completed_at > a.assigned_at
                )
                res_hours = round(total_hours / len(completed_assignments), 1)

            resolved_incidents_count = db.query(Incident).join(
                Assignment, Assignment.incident_id == Incident.id
            ).filter(
                Assignment.worker_id == w.id,
                Incident.status.in_(["resolved", "closed"])
            ).count()

            rework_count = db.query(Assignment).filter(
                Assignment.worker_id == w.id,
                Assignment.status == "rework_required"
            ).count()

            total_reviewed = resolved_incidents_count + rework_count
            verification_rate = round((resolved_incidents_count / max(1, total_reviewed)) * 100.0, 1)

            metrics.append({
                "worker_id": w.id,
                "worker_name": w.full_name,
                "employee_id": w.worker_profile.employee_id if w.worker_profile else "EMP-001",
                "department": w.worker_profile.department if w.worker_profile else "Water Operations",
                "zone": w.worker_profile.zone if w.worker_profile else "Central",
                "specialization": w.worker_profile.specialization if w.worker_profile else "General Plumbing",
                "completed_tasks": len(completed_assignments),
                "active_tasks": active_count,
                "avg_resolution_hours": res_hours,
                "verification_rate": verification_rate
            })

        return metrics

analytics_service = AnalyticsService()
