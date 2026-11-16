"""
Report and Image Data Repository.
"""
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app.models.report import Report, ReportImage, DuplicateCandidate
from app.models.incident import ReportIncidentLink

class ReportRepository(BaseRepository[Report]):
    def __init__(self):
        super().__init__(Report)

    def get_by_report_number(self, db: Session, report_number: str) -> Optional[Report]:
        return db.query(Report).filter(Report.report_number == report_number).first()

    def filter_reports(
        self,
        db: Session,
        citizen_id: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Report], int]:
        q = db.query(Report)
        if citizen_id:
            q = q.filter(Report.citizen_id == citizen_id)
        if status:
            q = q.filter(Report.status == status)
        if category:
            q = q.filter(Report.category == category)
        total = q.count()
        items = q.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def add_image(
        self,
        db: Session,
        report_id: str,
        image_url: str,
        file_name: str,
        file_size: int,
        mime_type: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        is_primary: bool = False
    ) -> ReportImage:
        img = ReportImage(
            report_id=report_id,
            image_url=image_url,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            width=width,
            height=height,
            is_primary=is_primary
        )
        db.add(img)
        db.flush()
        return img

    def get_incident_link(self, db: Session, report_id: str) -> Optional[ReportIncidentLink]:
        return db.query(ReportIncidentLink).filter(ReportIncidentLink.report_id == report_id).first()

report_repository = ReportRepository()

