# WaterWatch REST API Contract & Specification

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Protocol:** HTTPS / HTTP REST  
**Data Format:** JSON (`application/json`) & Multipart Form Data (`multipart/form-data`)  
**Security:** Argon2id Password Hashing, JWT Bearer Token (`Authorization: Bearer <token>`)

---

## 1. Authentication & Role-Based Access Control (RBAC)

### Supported Roles
WaterWatch enforces server-side role validation across three core domains:
- **`resident`** (aliased to **`citizen`**): Can submit reports with photos and GPS coordinates, view their own reports, track repair lifecycles, and receive in-app status updates.
- **`worker`**: Can view assigned field tasks, accept dispatches, post site progress notes, upload before/after repair evidence, and submit work orders for verification. (Restricted from directly resolving incidents).
- **`admin`**: Full operational authority: Incident triage, multi-report linking, AI duplicate review, technician dispatch and reassignment, quality verification, and system analytics.

### Authentication Header
Protected endpoints require an `Authorization` header formatted as:
```http
Authorization: Bearer <jwt_access_token>
```

---

## 2. Standard Error Response Structure

All client and server errors return a predictable JSON payload:
```json
{
  "message": "Human-readable description of error or failure",
  "code": "ERROR_CODE_CONSTANT"
}
```

### Standard Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation error, invalid coordinate, or forbidden status transition (`BAD_REQUEST`).
- `401 Unauthorized`: Missing, expired, or invalid JWT credentials (`UNAUTHORIZED`).
- `403 Forbidden`: Authenticated user lacks permission or attempted to access another user's private data (`FORBIDDEN`).
- `404 Not Found`: Target entity does not exist (`NOT_FOUND`).
- `409 Conflict`: Resource collision, e.g. duplicate email registration or already linked report (`CONFLICT`).
- `422 Unprocessable Entity`: Request body schema or field validation failure (`VALIDATION_ERROR`).
- `500 Internal Server Error`: Server failure with sanitized details to prevent credential/trace leakage.

---

## 3. Endpoints Specification

### 3.1 Authentication (`/auth`)

#### `POST /auth/register`
Creates a new account. Residents and Workers can be registered.
- **Request Body (`application/json`):**
  ```json
  {
    "email": "resident@example.com",
    "password": "Password123!",
    "full_name": "Jane Doe",
    "phone": "+1-555-0100",
    "role": "resident",
    "address": "45 Maple Ave",
    "latitude": 12.9716,
    "longitude": 77.5946
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": "e93b1695-8e10-48e0-bb15-373df9e663da",
    "email": "resident@example.com",
    "full_name": "Jane Doe",
    "phone": "+1-555-0100",
    "role": "citizen",
    "is_active": true,
    "created_at": "2026-11-16T10:00:00Z",
    "citizen_profile": {
      "id": "4be78f3c-238d-4f10-9118-a6f6717a61d1",
      "address": "45 Maple Ave",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "preferred_radius_km": 5.0,
      "notify_email": true,
      "notify_in_app": true
    }
  }
  ```

#### `POST /auth/login`
Authenticates credentials and issues a JWT token.
- **Request Body (`application/json`):**
  ```json
  {
    "email": "resident@example.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "role": "citizen",
    "user_id": "e93b1695-8e10-48e0-bb15-373df9e663da",
    "full_name": "Jane Doe",
    "email": "resident@example.com"
  }
  ```

#### `POST /auth/logout`
Terminates user session and records logout in system audit trail.
- **Response (`200 OK`):**
  ```json
  {
    "message": "Successfully logged out. Client token invalidated.",
    "status": "logged_out"
  }
  ```

#### `GET /auth/me`
Retrieves current profile and role information.
- **Response (`200 OK`):** `UserOut` schema.

---

### 3.2 Citizen Reports (`/reports`)

#### `POST /reports/`
Submits a new leak observation.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `title` (string, required): Brief title describing issue.
  - `category` (string, required): `pipe_leak`, `overflow`, `damaged_valve`, `low_pressure`, `contamination`, `other`.
  - `description` (string, required): Detailed observation.
  - `estimated_flow` (string, optional): `trickle`, `moderate_stream`, `heavy_flow`, `gushing_geyser`.
  - `affected_households` (integer, optional): Estimated impacted homes.
  - `latitude` (float, required): Valid between `-90.0` and `+90.0`.
  - `longitude` (float, required): Valid between `-180.0` and `+180.0`.
  - `address_text` (string, required): Physical street location.
  - `landmark` (string, optional): Nearby municipal landmark.
  - `images` (files array, optional): JPEG, PNG, WEBP files (Max 10MB each).
- **Response (`201 Created`):**
  ```json
  {
    "id": "7ec9e2ef-2c6e-44ef-a6bc-e21e64f0b2f4",
    "citizen_id": "e93b1695-8e10-48e0-bb15-373df9e663da",
    "report_number": "REP-2026-0001",
    "title": "Severe Mainline Leak",
    "category": "pipe_leak",
    "status": "submitted",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address_text": "12 Main St",
    "images": [
      {
        "id": "uuid...",
        "image_url": "/uploads/reports/f47ac10b.jpg",
        "file_name": "leak_photo.jpg",
        "file_size": 245000,
        "is_primary": true
      }
    ]
  }
  ```

#### `GET /reports/`
Lists reports. Residents can only access their own submissions.
- **Query Parameters:** `status`, `category`, `mine` (boolean), `skip` (int), `limit` (int).

#### `GET /reports/{report_id}`
Returns details of a report. Enforces strict ownership (Resident receives 403 Forbidden on foreign reports).

#### `GET /reports/{report_id}/history`
Retrieves timestamped status history changes for the report.

#### `GET /reports/nearby`
Returns reports within a radius around GPS coordinates.
- **Query Parameters:** `latitude` (float), `longitude` (float), `radius_km` (float, default 5.0).

#### `POST /reports/{report_id}/evidence`
Allows resident or admin to attach follow-up photographs and commentary.

---

### 3.3 Incidents & Work Orders (`/incidents`)

#### `POST /incidents/`
Administrator creates a municipal incident work order.
- **Request Body (`application/json`):**
  ```json
  {
    "title": "Main Distribution Pipeline Rupture",
    "category": "pipe_leak",
    "description": "High pressure pipe failure affecting South Grid.",
    "severity": "critical",
    "priority": "p1",
    "latitude": 12.9750,
    "longitude": 77.5950,
    "address_text": "Oakridge Substation",
    "zone": "Central",
    "initial_report_id": "optional-report-uuid"
  }
  ```

#### `GET /incidents/`
Lists incidents with filtering.
- **Query Parameters:** `status`, `severity`, `priority`, `zone`, `skip`, `limit`.

#### `GET /incidents/{incident_id}`
Returns incident details with linked reports list, dispatch history, repair evidence, and audit timeline.

#### `PUT /incidents/{incident_id}`
Updates severity, priority, or status with transition validation.

#### `POST /incidents/{incident_id}/link`
Links an additional citizen report to the incident work order.
- **Request Body:** `{ "report_id": "uuid...", "notes": "..." }`

#### `GET /incidents/{incident_id}/history`
Returns chronological lifecycle status changes.

---

### 3.4 Assignments & Field Repairs (`/assignments`)

#### `POST /assignments/`
Administrator assigns technician to an incident.
- **Request Body:**
  ```json
  {
    "incident_id": "uuid...",
    "worker_id": "uuid...",
    "instructions": "Replace flange gasket and test pressure.",
    "priority": "p2"
  }
  ```

#### `POST /assignments/reassign`
Administrator reassigns an incident to a new worker.
- **Request Body:**
  ```json
  {
    "incident_id": "uuid...",
    "new_worker_id": "uuid...",
    "instructions": "Reassigned due to technician shift handover."
  }
  ```

#### `POST /assignments/{id}/accept`
Technician accepts assigned task. Transitions incident to `in_progress`.

#### `POST /assignments/{id}/updates`
Technician records progress notes (arrival, excavation, parts requested).
- **Request Body:** `{ "update_type": "arrival", "notes": "On site with equipment" }`

#### `POST /assignments/{id}/evidence`
Technician uploads photographic evidence (`multipart/form-data`).
- **Form Fields:** `evidence_type` (`before`, `in_progress`, `after`), `notes`, `materials_used`, `image` (file).

#### `POST /assignments/{id}/complete`
Technician submits repair for supervisory verification. (Blocked if 0 evidence photos attached).

#### `POST /assignments/incidents/{incident_id}/verify`
Administrator verifies resolution.
- **Request Body:**
  ```json
  {
    "approved": true,
    "feedback_notes": "Repairs inspected and verified. Water flow restored."
  }
  ```
- **Result:**
  - If `approved=true`: Incident and all linked reports transition to `resolved`. Citizens and technicians receive notifications.
  - If `approved=false`: Incident returns to `in_progress`, assignment transitions to `rework_required`, technician notified with feedback notes.

---

### 3.5 AI Duplicate Review & Suggestions (`/ai`)

#### `GET /ai/suggestions`
Retrieves AI category predictions and urgency scores for reports or incidents.

#### `GET /ai/duplicates`
Lists AI-detected candidate duplicate report pairs.
- **Query Parameters:** `status` (`detected`, `confirmed_duplicate`, `dismissed`).

#### `POST /ai/duplicates/{candidate_id}/review`
Administrator confirms or dismisses candidate duplicate.
- **Request Body:**
  ```json
  {
    "status": "confirmed_duplicate",
    "link_to_incident": true,
    "incident_id": "uuid..."
  }
  ```

#### `GET /ai/incidents/{incident_id}/recommended-workers`
Returns ranked list of technicians based on zone proximity, specialization match, and current active task load.

---

### 3.6 Maintenance Teams (`/teams`)

#### `GET /teams/`
Lists municipal maintenance teams, operational zones, and current crew members.

#### `POST /teams/`
Administrator creates a new operational maintenance crew.

#### `POST /workers/register`
Administrator registers a field maintenance technician with specific zone, department, and maximum task limits.

---

### 3.7 Operational Analytics (`/analytics`)

#### `GET /analytics/dashboard`
Returns Recharts-compatible KPIs:
- `total_reports`, `pending_reviews`, `active_incidents`, `open_incidents`, `verified_incidents`, `assigned_incidents`, `in_progress_incidents`, `pending_verification`, `resolved_incidents`.
- `average_resolution_hours`, `critical_incidents`.
- `reports_by_category` (percentages and counts).
- `incidents_by_severity` and `incidents_by_zone`.
- `trends` (14-day daily report and resolution series).

#### `GET /analytics/workers`
Technician performance statistics, turnaround hours, and quality approval rates.

#### `GET /analytics/reports/monthly`
6-month trend series for monthly submissions and resolutions.

#### `GET /analytics/incidents/geographic`
Zone-level summaries with GPS centroid averages and status distributions.

---

## 4. Status Transition Lifecycle

```
[Citizen] REPORTED / submitted
               │
               ▼
      UNDER_REVIEW / investigating
               │
               ▼
      VERIFIED / linked (Linked to Incident)
               │
               ▼
[Admin]    ASSIGNED (Technician Dispatched)
               │
               ▼
[Worker]   IN_PROGRESS (Worker Mobilized / Accepted)
               │
               ▼
[Worker]   REPAIR_SUBMITTED / work_submitted (Photographs Uploaded)
               │
               ▼
[Admin]    VERIFICATION_PENDING
          ┌────┴────┐
 [Approved]        [Rejected / Rework]
      │                     │
      ▼                     ▼
   RESOLVED           IN_PROGRESS
(All Linked Reports   (rework_required)
   Resolved &
 Citizens Notified)
```
