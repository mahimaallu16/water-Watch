from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import generate_uuid, get_utc_now

class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=True, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    suggestion_type = Column(String(50), nullable=False, index=True) # category, duplicate, priority, assignment
    suggested_value = Column(JSON, nullable=False) # e.g. {"category": "pipe_leak", "confidence": 0.88}
    confidence_score = Column(Float, nullable=False)
    reasoning = Column(Text, nullable=False)
    review_status = Column(String(50), default="pending", nullable=False, index=True) # pending, accepted, rejected, overridden
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    report = relationship("Report", back_populates="ai_suggestions", foreign_keys=[report_id])
    incident = relationship("Incident", back_populates="ai_suggestions", foreign_keys=[incident_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

