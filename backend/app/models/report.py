from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import generate_uuid, get_utc_now

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    report_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True) # pipe_leak, overflow, damaged_valve, low_pressure, contamination, other
    description = Column(Text, nullable=False)
    estimated_flow = Column(String(50), default="moderate_stream") # trickle, moderate_stream, heavy_flow, gushing_geyser
    affected_households = Column(Integer, default=1)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address_text = Column(String(500), nullable=False)
    landmark = Column(String(255), nullable=True)
    status = Column(String(50), default="submitted", nullable=False, index=True) # submitted, under_review, linked, resolved, rejected
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    citizen = relationship("User", back_populates="reports", foreign_keys=[citizen_id])
    images = relationship("ReportImage", back_populates="report", cascade="all, delete-orphan")
    ai_suggestions = relationship("AISuggestion", back_populates="report", cascade="all, delete-orphan", foreign_keys="AISuggestion.report_id")
    duplicate_candidates = relationship("DuplicateCandidate", back_populates="report", foreign_keys="DuplicateCandidate.report_id", cascade="all, delete-orphan")
    incident_link = relationship("ReportIncidentLink", back_populates="report", uselist=False)
    feedback = relationship("CitizenFeedback", back_populates="report", uselist=False, cascade="all, delete-orphan")

class ReportImage(Base):
    __tablename__ = "report_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(50), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    report = relationship("Report", back_populates="images")

class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    potential_duplicate_report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False) # 0.0 to 1.0
    distance_meters = Column(Float, nullable=False)
    time_diff_hours = Column(Float, nullable=False)
    text_similarity = Column(Float, default=0.0)
    category_match = Column(Boolean, default=False)
    status = Column(String(50), default="detected", nullable=False) # detected, confirmed_duplicate, dismissed
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    report = relationship("Report", back_populates="duplicate_candidates", foreign_keys=[report_id])
    potential_duplicate = relationship("Report", foreign_keys=[potential_duplicate_report_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

