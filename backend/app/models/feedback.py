from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import generate_uuid, get_utc_now

class CitizenFeedback(Base):
    __tablename__ = "citizen_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    rating = Column(Integer, nullable=False) # 1 to 5 stars
    satisfaction_category = Column(String(100), nullable=True) # e.g., "Fast Response", "Clean Worksite", "High Quality", "Delayed Repair", "Issue Persists"
    comments = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    report = relationship("Report", back_populates="feedback")
    citizen = relationship("User", foreign_keys=[citizen_id])
    incident = relationship("Incident", foreign_keys=[incident_id])
