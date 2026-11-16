from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import generate_uuid, get_utc_now

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_number = Column(String(50), unique=True, nullable=False, index=True) # INC-2026-0001
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="medium", nullable=False, index=True) # low, medium, high, critical
    priority = Column(String(50), default="p3", nullable=False, index=True) # p1, p2, p3, p4
    status = Column(String(50), default="investigating", nullable=False, index=True) # investigating, assigned, in_progress, work_submitted, resolved, closed
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address_text = Column(String(500), nullable=False)
    zone = Column(String(100), default="Central", nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    target_resolution_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    report_links = relationship("ReportIncidentLink", back_populates="incident", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="incident", cascade="all, delete-orphan")
    repair_evidence = relationship("RepairEvidence", back_populates="incident", cascade="all, delete-orphan")
    repair_updates = relationship("RepairUpdate", back_populates="incident", cascade="all, delete-orphan")
    ai_suggestions = relationship("AISuggestion", back_populates="incident", foreign_keys="AISuggestion.incident_id", cascade="all, delete-orphan")

class ReportIncidentLink(Base):
    __tablename__ = "report_incident_links"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), unique=True, nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    linked_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    linked_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    report = relationship("Report", back_populates="incident_link")
    incident = relationship("Incident", back_populates="report_links")
    linker = relationship("User", foreign_keys=[linked_by])

