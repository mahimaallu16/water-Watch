# Team Development Ownership Specification

This specification assigns modular boundaries and responsibilities across three independent developer tracks without integration collisions.

---

## Developer 1: Frontend Architect & UI/UX Engineer
**Primary Directory Ownership:** `frontend/`

### Deliverables:
1. **Three Role-Based Portals:**
   - **Citizen Portal**:
     - `CitizenDashboard.jsx`: KPI summaries, recent reports, nearby incidents map.
     - `NewReport.jsx`: Multi-step reporting wizard with Leaflet GPS location picker and photo preview.
     - `MyReports.jsx` & `ReportDetail.jsx`: Status stepper, photos, linked incident details, and additional evidence submission.
     - `NearbyProblems.jsx`: Radius-controlled Leaflet map.
     - `CitizenProfile.jsx`: Contact details & notification preferences.
   - **Administrator Portal**:
     - `AdminDashboard.jsx`: Real-time KPIs, Recharts graphs (category pie, 14-day trend line, severity bar), GIS map, recent audit stream.
     - `ReportsQueue.jsx` & `ReportReviewDetail.jsx`: Inspect report, view AI predictions (confidence, suggested category, priority score), create or link work orders.
     - `DuplicateReview.jsx`: Side-by-side comparison of duplicate report candidates with one-click link or dismiss actions.
     - `IncidentsList.jsx` & `IncidentDetail.jsx`: Work orders, worker assignment, repair evidence review, quality verification approval/rejection.
     - `MapExplorer.jsx`: Geospatial explorer.
     - `WorkerManagement.jsx`: Staff availability and load.
     - `Analytics.jsx` & `AuditLogs.jsx`: Performance metrics and full audit trail.
   - **Field Worker Portal**:
     - `WorkerDashboard.jsx`: Active work orders, urgent tasks, and map.
     - `TaskList.jsx` & `TaskDetail.jsx`: Work order execution, arrival notes, before/after evidence photograph upload, completion submission.
     - `WorkerHistory.jsx`: Verified job history.
2. **Design System & Components:**
   - `index.css`: Cohesive water-infrastructure theme, responsive design, custom badges, modal system, card layouts.
   - `LocationPicker.jsx`, `IncidentMap.jsx`, `NearbyReportsMap.jsx` using Leaflet.
   - Recharts data visualization charts.
   - `AuthContext.jsx` and `ToastContext.jsx`.
3. **Testing:**
   - Vitest suite in `frontend/src/tests/` and Vite production build verification.

---

## Developer 2: Backend & Core Data Engineer
**Primary Directory Ownership:** `backend/app/models/`, `backend/app/api/v1/`, `backend/app/services/` (auth, report, incident, assignment, audit, notification)

### Deliverables:
1. **Database Schema & Migrations:**
   - 16 normalized SQLAlchemy models: `users`, `roles`, `citizen_profiles`, `worker_profiles`, `reports`, `report_images`, `incidents`, `report_incident_links`, `ai_suggestions`, `duplicate_candidates`, `assignments`, `repair_updates`, `repair_evidence`, `status_history`, `notifications`, `audit_logs`.
   - UUID primary keys, foreign key constraints, indexes, and timestamps.
   - Alembic migration scripts.
2. **Authentication & Authorization:**
   - JWT authentication (`pyjwt`, `python-jose`).
   - Secure Argon2id password hashing with bcrypt fallback (`security.py`).
   - Role-based dependencies (`require_admin`, `require_worker`, `require_citizen`).
3. **Core APIs & Services:**
   - Report lifecycle service and incident linking.
   - Work order assignment, technician progress updates, and resolution verification.
   - Status history recording and centralized audit logging.
   - Image validation using Pillow (MIME check, size limit, sanitize re-encode).
4. **Testing:**
   - Pytest unit and integration tests in `backend/tests/test_auth.py`, `test_reports.py`, `test_incidents.py`, `test_assignments.py`.

---

## Developer 3: AI & Operations Engineer
**Primary Directory Ownership:** `backend/app/ai/`, `backend/app/tasks/`, `backend/app/services/ai_service.py`, `backend/app/services/analytics_service.py`, Docker & CI

### Deliverables:
1. **PyTorch Defect Classifier (`image_classifier.py`):**
   - PyTorch `WaterIssueCNN` convolutional neural network.
   - Computer vision feature extraction heuristics baseline (water sheen, blue standing water ratio, sediment discoloration).
2. **Geospatial Duplicate Detection Engine (`duplicate_detector.py`):**
   - Haversine distance algorithm in meters.
   - Time-decay scoring (72-hour window).
   - Textual description similarity and category matching.
3. **Priority & Urgency Prediction Engine (`priority_predictor.py`):**
   - Category weights, flow intensity scoring, affected households factor.
   - Outputs urgency score ($0-100$), recommended severity, and priority tier (P1-P4).
4. **Technician Recommender Engine (`worker_recommender.py`):**
   - Technician ranking based on zone match, specialization, and active workload.
5. **Background Task Processing & Infrastructure:**
   - Celery worker and Redis task pipeline with resilient in-process execution fallback.
   - Docker Compose configuration (`postgres` with PostGIS, `redis`, `backend`, `celery_worker`, `frontend`).
   - GitHub Actions CI workflow (`.github/workflows/ci.yml`).
6. **Testing:**
   - `backend/tests/test_ai_services.py` and `test_workflow_e2e.py`.

