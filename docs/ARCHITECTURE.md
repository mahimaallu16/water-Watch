# WaterWatch System Architecture Document

## 1. Architectural Overview

WaterWatch is an integrated water-infrastructure incident reporting and repair management platform that connects:
1. **Citizens / Residents**: Report water leaks and infrastructure failures with GPS pins and photographs.
2. **Administrators / Area Managers**: Triage reports, evaluate AI suggestions, link reports to work orders, dispatch field technicians, and verify repair resolution.
3. **Field Technicians / Contractors**: Mobilize to sites, execute repairs, upload before-and-after photographic evidence, and submit work for supervisor approval.

All three roles interact through **one single unified backend**, shared PostgreSQL/PostGIS database, and unified JWT authentication system.

```
+-----------------------------------------------------------------------------------+
|                            WATERWATCH UNIFIED PLATFORM                            |
+-----------------------------------------------------------------------------------+
|  CITIZEN PORTAL         |   ADMINISTRATOR PORTAL     |    FIELD WORKER PORTAL     |
|  - Leak Reporting Form  |   - Incident Command Center|    - Task Dispatch Queue   |
|  - GPS Location Picker  |   - AI Duplicate Queue     |    - Site Navigation       |
|  - Progress Stepper     |   - Worker Dispatch Engine |    - Photo Evidence Upload |
|  - Nearby Problems Map  |   - Verification Approvals |    - Completion Submission |
+-----------------------------------------------------------------------------------+
                                         |
                                (REST / JSON / JWT)
                                         v
+-----------------------------------------------------------------------------------+
|                             FASTAPI CORE BACKEND                                  |
+-----------------------------------------------------------------------------------+
|  /auth         |  /reports       |  /incidents     |  /assignments  |  /ai        |
|  /users        |  /notifications |  /analytics     |  /audit        |  /workers   |
+-----------------------------------------------------------------------------------+
              |                                            |
              v                                            v
+-----------------------------+             +---------------------------------------+
|  DATABASE (SQLAlchemy)      |             | AI INTELLIGENCE ENGINE                |
|  - PostgreSQL + PostGIS     |             | - PyTorch CNN Classifier              |
|  - Users & Profiles         |             | - Geospatial Duplicate Detector       |
|  - Reports & Incidents      |             | - Urgency & Priority Predictor        |
|  - Assignments & Evidence   |             | - Worker Dispatch Recommender         |
|  - Status History & Audit   |             +---------------------------------------+
+-----------------------------+                                |
                                                               v
                                            +---------------------------------------+
                                            | CELERY / REDIS BACKGROUND PROCESSING  |
                                            | - Async Report Classification         |
                                            | - Real-time Duplicate Clustering      |
                                            +---------------------------------------+
```

## 2. Core Separation of Report vs Incident

A foundational architectural requirement in WaterWatch is the strict distinction between **Reports** and **Incidents**:

1. **Report (`reports`)**:
   - Represents an observation filed by an individual citizen.
   - Contains raw citizen description, estimated flow rate, GPS coordinates, and photographs.
   - Multiple citizens in a neighborhood may report the same rupture independently.

2. **Incident (`incidents`)**:
   - Represents an authorized municipal work order.
   - Has priority (P1 to P4), severity, assigned field worker, target resolution deadline, and formal repair evidence.
   - **Report-Incident Link (`report_incident_links`)**: Links $N$ citizen reports to $1$ incident. When an incident is verified and marked resolved, all linked citizen reports transition to resolved and citizens receive automated notifications.

## 3. AI Service Pipeline

The AI engine in `backend/app/ai/` consists of four independent engines:

1. **PyTorch Image Classifier (`image_classifier.py`)**:
   - `WaterIssueCNN`: 4-layer convolutional neural network for image classification.
   - Features deterministic computer vision heuristics fallback inspecting color spectrum, water sheen, sediment turbidity, and pipe hardware.
   - Returns suggested category and confidence score.

2. **Duplicate Detection Engine (`duplicate_detector.py`)**:
   - Haversine distance formula calculates spherical proximity in meters.
   - Time-decay function evaluates reports filed within 72 hours.
   - Token-set Jaccard textual similarity evaluates description overlap.
   - Generates composite score ($0.0 - 1.0$) and human-readable reasons. Never automatically deletes reports.

3. **Priority Prediction Engine (`priority_predictor.py`)**:
   - Evaluates category baseline weight, flow rate intensity, affected household count, and photo evidence.
   - Outputs urgency score ($0 - 100$), recommended severity (`critical`, `high`, `medium`, `low`), and priority tier (`p1` - `p4`).

4. **Worker Recommendation Engine (`worker_recommender.py`)**:
   - Evaluates active workload vs technician capacity limit (`max_active_tasks`).
   - Evaluates zone proximity (`worker_profile.zone == incident.zone`).
   - Evaluates technician specialization match.

