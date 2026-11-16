# WaterWatch — Water Infrastructure Incident & Repair Management Platform

WaterWatch is an integrated water-infrastructure reporting, triage, and repair platform connecting **citizens**, **administrators**, and **field workers** into one shared operational view.

---

## 💧 Core Capabilities

- **Three Role-Based Portals in One Application**:
  1. **Citizen Portal**: Report water problems with GPS pins and photos, track repair progress with visual steppers, view nearby community issues, and upload follow-up evidence.
  2. **Administrator Portal**: Real-time KPI dashboards, Recharts analytics, Leaflet GIS incident map, review AI suggestions, inspect duplicate candidates side-by-side, create/link incidents, dispatch field workers, and verify repair quality.
  3. **Field Worker Portal**: View dispatched jobs, navigate via map coordinates, post site progress updates, upload before/after photographic repair evidence, and submit work for verification.
- **AI & Intelligence Services (PyTorch + Python)**:
  - **PyTorch Image Analysis**: CNN classification with computer vision heuristic fallback (water sheen, sediment discoloration, metal pipe detection).
  - **Duplicate Detection**: Geospatial Haversine distance, time-decay scoring, and description text similarity. Duplicates are presented for human review and never silently deleted.
  - **Priority Prediction**: Computes urgency scores (0–100) and recommends severity (Low to Critical) and priority tiers (P1 to P4).
  - **Worker Dispatch Recommender**: Ranks technicians by zone, specialization match, and current workload.
- **Strict Separation of Report vs Incident**: Multiple citizen reports can belong to one municipal work order. When verified resolved, all linked citizen reports transition to resolved and citizens are notified.
- **Robust Security & Auditability**: JWT authentication, Argon2id/bcrypt password hashing, Pillow image validation, role-based access control, and complete immutable audit logs and status history.

---

## 🛠️ Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React (JavaScript only, no TypeScript), Vite, Leaflet + OpenStreetMap, Recharts, Lucide Icons, Custom CSS |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Alembic, PostgreSQL + PostGIS (with SQLite dev fallback) |
| **Security** | JWT Tokens (`pyjwt`), Argon2id / bcrypt password hashing, RBAC |
| **Image Processing** | Pillow (MIME validation, size checks, sanitization) |
| **AI Services** | PyTorch (`torch`, `torchvision`), Scikit-learn, Shapely |
| **Background Tasks** | Celery + Redis (with synchronous / background-tasks execution fallback) |
| **Testing & CI** | Pytest (Backend 15/15 passing), Vitest (Frontend 3/3 passing), GitHub Actions CI |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

---

### Method 1: Local Development (Fastest)

#### 1. Start the Backend
```bash
# From workspace root:
cd backend
python -m pip install -r requirements.txt  # If dependencies not yet installed

# Seed demo data and start FastAPI server
python -c "import sys; sys.path.insert(0, '.'); from app.db.seed import seed_database; seed_database()"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 2. Start the Frontend
```bash
# In a new terminal from workspace root:
cd frontend
npm install   # If dependencies not yet installed
npm run dev
```
- Open the application: [http://localhost:5173](http://localhost:5173)

---

### Method 2: Docker Compose (Production Setup)

```bash
# Start PostgreSQL (PostGIS), Redis, Backend, Celery Worker, and Frontend
docker-compose up --build
```
- Application Portal: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 Demo Seed Accounts

Quick-fill demo buttons are available directly on the login screen:

| Role | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@waterwatch.org` | `Password123!` | Incident management, AI duplicate review, worker dispatch, repair verification, analytics |
| **Field Worker** | `worker@waterwatch.org` | `Password123!` | Field dispatches, arrival updates, photo evidence upload, completion submission |
| **Citizen / Resident** | `citizen@waterwatch.org` | `Password123!` | Leak reporting, map GPS location selection, progress tracking, nearby reports map |

---

## 🧪 Automated Testing

### Backend Tests (Pytest)
```bash
python -m pytest backend/tests -v
```
**Results:** `15 passed` (Auth, Reports, Incidents, Assignments, AI Services, and full E2E 14-step report-to-repair lifecycle).

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test
```
**Results:** `3 passed` (Formatters and utilities).

### Frontend Production Build
```bash
cd frontend
npm run build
```
**Results:** Production assets generated in `frontend/dist/` in 10s.

---

## 📋 Acceptance Criteria Checklist

- [x] All three roles (Citizen, Admin, Field Worker) can authenticate and log in.
- [x] Role-based permissions and route guards enforced on frontend and backend.
- [x] Citizens can submit reports with photographs and map coordinates.
- [x] Reports persist with UUIDs, timestamps, and normalized relationships.
- [x] AI suggestions generated for categories, priority, duplicates, and workers with fallback.
- [x] Duplicate candidates queue displayed with side-by-side comparison and human review.
- [x] Administrators can create work orders and link multiple reports to one incident.
- [x] Administrators can assign field workers with AI recommendation ranking.
- [x] Field workers can accept dispatches, post progress notes, and upload repair evidence.
- [x] Administrators can verify or reject repair resolutions with feedback.
- [x] Citizens track repair progress via visual stepper and receive in-app notifications.
- [x] Interactive Leaflet OpenStreetMap and Recharts visual analytics powered by real database data.
- [x] Complete status transition history and audit trail persisted.
- [x] Docker Compose and Dockerfile configured for Postgres/PostGIS, Redis, Backend, Celery, and Frontend.
- [x] Comprehensive test suites passing with 100% pass rate.

