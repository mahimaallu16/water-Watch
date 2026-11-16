# WaterWatch API Contracts (v1)

Base URL: `/api/v1`

## 1. Authentication (`/auth`)

### POST `/auth/register`
Creates a new user profile.
- **Request Body:**
  ```json
  {
    "email": "resident@example.com",
    "password": "Password123!",
    "full_name": "Jane Citizen",
    "phone": "+1-555-0199",
    "role": "citizen",
    "address": "45 Maple Ave"
  }
  ```
- **Response (201 Created):** `UserOut`

### POST `/auth/login`
Authenticates credentials and issues JWT token.
- **Request Body:**
  ```json
  {
    "email": "admin@waterwatch.org",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "role": "admin",
    "user_id": "uuid...",
    "full_name": "Director David Mitchell",
    "email": "admin@waterwatch.org"
  }
  ```

---

## 2. Reports (`/reports`)

### POST `/reports/`
Submits a new citizen leak report (multipart/form-data).
- **Form Fields:** `title`, `category`, `description`, `estimated_flow`, `affected_households`, `latitude`, `longitude`, `address_text`, `landmark`
- **Files:** `images` (optional array of JPEG, PNG, WEBP files)
- **Response (201 Created):** `ReportOut` with auto-assigned `report_number` (e.g. `REP-2026-0001`).

### GET `/reports/`
Lists reports.
- **Query Params:** `status`, `category`, `mine` (boolean), `skip`, `limit`
- **Response (200 OK):** Array of `ReportOut`

### GET `/reports/nearby`
Retrieves reports within a geographical radius.
- **Query Params:** `latitude`, `longitude`, `radius_km` (default: 5.0)
- **Response (200 OK):** Array of `ReportOut` with `distance_km` field.

---

## 3. Incidents (`/incidents`)

### POST `/incidents/`
Creates a municipal incident.
- **Request Body:** `IncidentCreate`
- **Response (201 Created):** `IncidentDetailOut`

### GET `/incidents/`
Lists incidents with filtering.
- **Query Params:** `status`, `severity`, `priority`, `zone`, `skip`, `limit`
- **Response (200 OK):** Array of `IncidentDetailOut`

### POST `/incidents/{id}/link`
Links a citizen report to an existing incident.
- **Request Body:** `{ "report_id": "uuid...", "notes": "..." }`
- **Response (200 OK):** Updated `IncidentDetailOut`

---

## 4. Assignments & Repairs (`/assignments`)

### POST `/assignments/`
Assigns a technician to an incident.
- **Request Body:** `{ "incident_id": "...", "worker_id": "...", "instructions": "...", "priority": "p2" }`

### POST `/assignments/{id}/accept`
Technician accepts assignment. Status transitions to `in_progress`.

### POST `/assignments/{id}/evidence`
Technician uploads before/in_progress/after photographic evidence.
- **Form Fields:** `evidence_type` (`before`, `in_progress`, `after`), `notes`, `materials_used`
- **Files:** `image`

### POST `/assignments/{id}/complete`
Technician submits work for verification.

### POST `/assignments/incidents/{incident_id}/verify`
Admin verifies resolution.
- **Request Body:**
  ```json
  {
    "approved": true,
    "feedback_notes": "Repairs inspected and verified by supervisor."
  }
  ```
- **Result:** If `approved=true`, incident and all linked reports are marked `resolved`, and citizens are notified.

---

## 5. AI Services (`/ai`)

### GET `/ai/suggestions`
Retrieves AI predictions for a report or incident.
- **Query Params:** `report_id`, `incident_id`

### GET `/ai/duplicates`
Lists AI-detected duplicate report pairs.
- **Query Params:** `status` (`detected`, `confirmed_duplicate`, `dismissed`)

### POST `/ai/duplicates/{candidate_id}/review`
Admin reviews a duplicate pair.
- **Request Body:**
  ```json
  {
    "status": "confirmed_duplicate",
    "link_to_incident": true,
    "incident_id": "uuid..."
  }
  ```

### GET `/ai/incidents/{incident_id}/recommended-workers`
Returns ranked list of technicians based on zone, workload, and specialization.

---

## 6. Operational Analytics (`/analytics`)

### GET `/analytics/dashboard`
Returns operational dashboard KPIs, category counts, 14-day trends, and severity breakdowns.

### GET `/analytics/workers`
Returns technician performance metrics, completed jobs, and verification approval rates.

