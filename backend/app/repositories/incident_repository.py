"""
Incident and Report Link Data Repository.
"""
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.incident import Incident, ReportIncidentLink

class IncidentRepository(BaseRepository[Incident]):
    def __init__(self):
        super().__init__(Incident)

    def get_by_number(self, db: Session, incident_number: str) -> Optional[Incident]:
        return db.query(Incident).filter(Incident.incident_number == incident_number).first()

    def filter_incidents(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        priority: Optional[str] = None,
        zone: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Incident], int]:
        q = db.query(Incident)
        if status:
            q = q.filter(Incident.status == status)
        if severity:
            q = q.filter(Incident.severity == severity)
        if priority:
            q = q.filter(Incident.priority == priority)
        if zone:
            q = q.filter(Incident.zone == zone)
        total = q.count()
        items = q.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_linked_reports(self, db: Session, incident_id: str) -> List[ReportIncidentLink]:
        return db.query(ReportIncidentLink).filter(ReportIncidentLink.incident_id == incident_id).all()

    def link_report(
        self,
        db: Session,
        incident_id: str,
        report_id: str,
        linked_by: str,
        notes: Optional[str] = None
    ) -> ReportIncidentLink:
        link = ReportIncidentLink(
            incident_id=incident_id,
            report_id=report_id,
            linked_by=linked_by,
            notes=notes
        )
        db.add(link)
        db.flush()
        return link

incident_repository = IncidentRepository()

