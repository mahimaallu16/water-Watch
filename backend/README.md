# WaterWatch Backend Architecture & Service Specification

## 1. Overview
The WaterWatch Backend is a modular monolithic REST API built on **FastAPI**, **SQLAlchemy**, and **PostgreSQL/PostGIS** (with SQLite development fallback). It manages the full lifecycle of water infrastructure issue reporting, incident triage, AI-assisted duplicate detection, technician dispatch, photo evidence submission, and administrative repair verification.

---

## 2. Directory Architecture
```
backend/
├── alembic/                      # Database migration scripts
├── app/
│   ├── ai/                       # AI intelligence modules (image CNN, duplicate detector, priority, worker)
│   ├── api/
│   │   ├── dependencies/         # Server-side auth & role checking dependencies
│   │   └── v1/                   # REST API routes (auth, reports, incidents, assignments, etc.)
│   ├── core/                     # Security, token generation, custom exceptions
│   ├── db/                       # Seed scripts and initial data fixtures
│   ├── middleware/               # OWASP security headers & request timing ASGI middleware
│   ├── models/                   # 16 normalized SQLAlchemy database models
│   ├── repositories/             # Data access repository layer (Base, User, Report, Incident, etc.)
│   ├── schemas/                  # Pydantic request and response schemas
│   ├── services/                 # Core business logic services
│   ├── tasks/                    # Celery / Redis asynchronous background task queue
│   ├── utils/                    # Geospatial (Haversine), coordinate validators, status state machines
│   ├── config.py                 # Application configuration & environment settings
│   ├── database.py               # Database engine, SessionLocal, and get_db dependency
│   └── main.py                   # FastAPI application root & exception handlers
├── tests/                        # Comprehensive Pytest test suite (33 tests, 100% pass)
├── uploads/                      # Local storage for sanitized reports & repair evidence images
├── requirements.txt              # Production and development dependencies
└── README.md                     # Backend documentation
```

---

## 3. Technology Stack & Security
- **Python**: 3.10+
- **Framework**: FastAPI with Pydantic v2
- **Database**: PostgreSQL with PostGIS (with SQLite fallback for local testing)
- **Authentication**: JWT access tokens (`HS256`, 24h default expiration)
- **Password Hashing**: Native **Argon2id** (`argon2-cffi`) with secure bcrypt fallback
- **File Validation**: Pillow integrity checks, dimension inspection, and UUID-based sanitize re-encoding
- **Asynchronous Tasks**: Celery with Redis broker (with graceful in-process fallback)
- **Testing**: Pytest & Starlette TestClient

---

## 4. Local Execution Instructions

### Step 1: Install Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### Step 2: Seed Database
Populate initial demo credentials and seed data:
```bash
python -c "import sys; sys.path.insert(0, '.'); from app.db.seed import seed_database; seed_database()"
```

### Step 3: Start the Backend API Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 5. Automated Testing
Run the Pytest suite covering authentication, RBAC, ownership, validation, duplicate review, and E2E lifecycles:
```bash
python -m pytest backend/tests -v
```

---

## 6. Seed Credentials

| Role | Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@waterwatch.org` | `Password123!` | Work order creation, AI duplicate review, technician dispatch, repair verification, analytics |
| **Field Worker** | `worker@waterwatch.org` | `Password123!` | Field dispatches, arrival updates, photo evidence upload, completion submission |
| **Resident / Citizen** | `citizen@waterwatch.org` | `Password123!` | Leak reporting, map GPS location selection, progress tracking, nearby reports map |
