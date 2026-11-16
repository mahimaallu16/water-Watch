from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.user import generate_uuid, get_utc_now

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="assigned", nullable=False, index=True) # assigned, accepted, in_progress, completed, rework_required
    instructions = Column(Text, nullable=True)
    priority = Column(String(50), default="p3", nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    incident = relationship("Incident", back_populates="assignments")
    worker = relationship("User", back_populates="assignments", foreign_keys=[worker_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
    updates = relationship("RepairUpdate", back_populates="assignment", cascade="all, delete-orphan")
    evidence = relationship("RepairEvidence", back_populates="assignment", cascade="all, delete-orphan")

class RepairUpdate(Base):
    __tablename__ = "repair_updates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    update_type = Column(String(50), nullable=False) # status_change, arrival, parts_requested, delay_notice, completion_note
    notes = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="updates")
    incident = relationship("Incident", back_populates="repair_updates")
    worker = relationship("User", foreign_keys=[worker_id])

class RepairEvidence(Base):
    __tablename__ = "repair_evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False, index=True)
    worker_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False) # before, in_progress, after
    image_url = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    materials_used = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="evidence")
    incident = relationship("Incident", back_populates="repair_evidence")
    worker = relationship("User", foreign_keys=[worker_id])

