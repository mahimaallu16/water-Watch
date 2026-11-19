-- =============================================================================
-- WaterWatch PostgreSQL + PostGIS Schema Definition
-- Target Engine: PostgreSQL 15+ with PostGIS 3.3+
-- Generated for WaterWatch Platform
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Clean Drop (For fresh deployment if needed)
-- DROP TABLE IF EXISTS repair_updates CASCADE;
-- DROP TABLE IF EXISTS repair_evidence CASCADE;
-- DROP TABLE IF EXISTS report_incident_links CASCADE;
-- DROP TABLE IF EXISTS report_images CASCADE;
-- DROP TABLE IF EXISTS duplicate_candidates CASCADE;
-- DROP TABLE IF EXISTS assignments CASCADE;
-- DROP TABLE IF EXISTS ai_suggestions CASCADE;
-- DROP TABLE IF EXISTS worker_profiles CASCADE;
-- DROP TABLE IF EXISTS status_history CASCADE;
-- DROP TABLE IF EXISTS reports CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS incidents CASCADE;
-- DROP TABLE IF EXISTS citizen_profiles CASCADE;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- -----------------------------------------------------------------------------
-- 1. ROLES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    permissions JSONB DEFAULT '[]'::jsonb
);

-- -----------------------------------------------------------------------------
-- 2. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 3. CITIZEN PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    preferred_radius_km DOUBLE PRECISION DEFAULT 5.0,
    notify_email BOOLEAN DEFAULT TRUE,
    notify_in_app BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 4. WORKER PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    zone VARCHAR(100) DEFAULT 'Central',
    specialization VARCHAR(100) DEFAULT 'General Repair',
    max_active_tasks INTEGER DEFAULT 5,
    is_available BOOLEAN DEFAULT TRUE,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_zone ON worker_profiles(zone);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_available ON worker_profiles(is_available);

-- -----------------------------------------------------------------------------
-- 5. INCIDENTS TABLE (Authorized Municipal Work Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(36) PRIMARY KEY,
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    priority VARCHAR(50) NOT NULL DEFAULT 'p3',     -- p1, p2, p3, p4
    status VARCHAR(50) NOT NULL DEFAULT 'investigating', -- investigating, assigned, in_progress, work_submitted, resolved, closed
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_text VARCHAR(500) NOT NULL,
    zone VARCHAR(100) NOT NULL DEFAULT 'Central',
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    target_resolution_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incidents_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(zone);
-- PostGIS Spatial Index for proximity searches:
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- -----------------------------------------------------------------------------
-- 6. REPORTS TABLE (Individual Citizen Submissions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    citizen_id VARCHAR(36) NOT NULL REFERENCES users(id),
    report_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    estimated_flow VARCHAR(50) DEFAULT 'moderate_stream',
    affected_households INTEGER DEFAULT 1,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_text VARCHAR(500) NOT NULL,
    landmark VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- submitted, under_review, linked, resolved, rejected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_citizen ON reports(citizen_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON reports(latitude, longitude);
-- PostGIS Spatial Index for duplicate clustering and radius queries:
CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- -----------------------------------------------------------------------------
-- 7. REPORT IMAGES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_images (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    width INTEGER,
    height INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id);

-- -----------------------------------------------------------------------------
-- 8. REPORT INCIDENT LINKS TABLE (Many Reports -> One Incident)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_incident_links (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL UNIQUE REFERENCES reports(id),
    incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id),
    linked_by VARCHAR(36) NOT NULL REFERENCES users(id),
    notes TEXT,
    linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_links_report ON report_incident_links(report_id);
CREATE INDEX IF NOT EXISTS idx_report_links_incident ON report_incident_links(incident_id);

-- -----------------------------------------------------------------------------
-- 9. ASSIGNMENTS TABLE (Dispatched Tasks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY,
    incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id),
    worker_id VARCHAR(36) NOT NULL REFERENCES users(id),
    assigned_by VARCHAR(36) NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'assigned', -- assigned, accepted, in_progress, completed, re_assigned
    instructions TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignments_incident ON assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_assignments_worker ON assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- -----------------------------------------------------------------------------
-- 10. REPAIR EVIDENCE TABLE (Before & After Proofs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repair_evidence (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id),
    incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id),
    worker_id VARCHAR(36) NOT NULL REFERENCES users(id),
    evidence_type VARCHAR(50) NOT NULL, -- before, after, during, invoice
    image_url VARCHAR(500) NOT NULL,
    notes TEXT,
    materials_used TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_repair_evidence_assignment ON repair_evidence(assignment_id);
CREATE INDEX IF NOT EXISTS idx_repair_evidence_incident ON repair_evidence(incident_id);

-- -----------------------------------------------------------------------------
-- 11. REPAIR UPDATES TABLE (Worker Field Progress Timeline)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repair_updates (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id),
    incident_id VARCHAR(36) NOT NULL REFERENCES incidents(id),
    worker_id VARCHAR(36) NOT NULL REFERENCES users(id),
    update_type VARCHAR(50) NOT NULL, -- en_route, on_site, assessing, parts_requested, work_started, testing, completed
    notes TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_repair_updates_assignment ON repair_updates(assignment_id);

-- -----------------------------------------------------------------------------
-- 12. DUPLICATE CANDIDATES TABLE (AI-Detected Duplicates)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    potential_duplicate_report_id VARCHAR(36) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    time_diff_hours DOUBLE PRECISION NOT NULL,
    text_similarity DOUBLE PRECISION DEFAULT 0.0,
    category_match BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'detected', -- detected, confirmed_duplicate, dismissed
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dup_candidates_report ON duplicate_candidates(report_id);
CREATE INDEX IF NOT EXISTS idx_dup_candidates_potential ON duplicate_candidates(potential_duplicate_report_id);

-- -----------------------------------------------------------------------------
-- 13. AI SUGGESTIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) REFERENCES reports(id) ON DELETE CASCADE,
    incident_id VARCHAR(36) REFERENCES incidents(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL, -- category, priority, duplicate, worker
    suggested_value JSONB NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    reasoning TEXT NOT NULL,
    review_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, overridden
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_report ON ai_suggestions(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_incident ON ai_suggestions(incident_id);

-- -----------------------------------------------------------------------------
-- 14. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(36),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- -----------------------------------------------------------------------------
-- 15. STATUS HISTORY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS status_history (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- report, incident, assignment
    entity_id VARCHAR(36) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(36) REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_status_history_entity ON status_history(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 16. AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
