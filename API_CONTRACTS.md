# API Contracts

## Purpose

This document defines concrete API contracts — request/response shapes, status codes, and examples — for every endpoint in MITRA. These are the source of truth for frontend-backend integration.

---

## General Format

### Request
```http
METHOD /api/v1/{domain}/{resource}
Authorization: Bearer {jwt}
Content-Type: application/json

{requestBody}
```

### Response (Success)
```http
HTTP/1.1 {statusCode}
Content-Type: application/json

{
  "data": { ... },
  "meta": {
    "requestId": "req_{uuid}",
    "timestamp": "{iso8601}"
  }
}
```

### Response (Error)
```http
HTTP/1.1 {statusCode}
Content-Type: application/json

{
  "error": {
    "code": "{ERROR_CODE}",
    "message": "{human_readable_message}",
    "details": [{ "field": "{field}", "message": "{detail}" }],
    "requestId": "req_{uuid}",
    "timestamp": "{iso8601}"
  }
}
```

---

## Commercial Domain

### POST /api/v1/commercial/customers

**Request:**
```json
{
  "name": "Acme Mold Corp",
  "industry": "automotive",
  "attributes": {
    "region": "NA",
    "tier": "gold"
  },
  "contacts": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@acme.com",
      "phone": "+1-555-0100",
      "role": "procurement_manager",
      "is_primary": true
    }
  ]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "c_abc123",
    "name": "Acme Mold Corp",
    "industry": "automotive",
    "status": "active",
    "contacts": [
      {
        "id": "ctc_xyz789",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john@acme.com",
        "is_primary": true
      }
    ],
    "created_at": "2026-07-27T10:30:00Z"
  },
  "meta": { "requestId": "req_001", "timestamp": "2026-07-27T10:30:00Z" }
}
```

### POST /api/v1/commercial/rfqs

**Request:**
```json
{
  "customer_id": "c_abc123",
  "specifications": {
    "mold_type": "injection",
    "cavity_count": 4,
    "material": "P20",
    "dimensions": { "length": 600, "width": 400, "height": 300 }
  },
  "attachments": ["doc_ref_001", "doc_ref_002"]
}
```

### POST /api/v1/commercial/quotations/{id}/accept

**Request:**
```json
{
  "project_name": "Acme Dashboard Panel - DSH-001"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "q_789",
    "status": "accepted",
    "project_id": "proj_001",
    "project_name": "Acme Dashboard Panel - DSH-001",
    "accepted_at": "2026-07-27T10:30:00Z"
  },
  "meta": { "requestId": "req_002", "timestamp": "2026-07-27T10:30:00Z" }
}
```

---

## Project Domain

### POST /api/v1/project/projects

**Request:**
```json
{
  "quotation_id": "q_789",
  "customer_id": "c_abc123",
  "name": "Acme Dashboard Panel - DSH-001",
  "start_date": "2026-08-01",
  "delivery_date": "2026-12-15",
  "priority": "high"
}
```

### GET /api/v1/project/projects?status=engineering&priority=high&page=1&pageSize=20

**Response (200):**
```json
{
  "data": [
    {
      "id": "proj_001",
      "name": "Acme Dashboard Panel - DSH-001",
      "status": "engineering",
      "priority": "high",
      "start_date": "2026-08-01",
      "delivery_date": "2026-12-15",
      "milestone_progress": "3/8",
      "created_at": "2026-07-27T10:30:00Z"
    }
  ],
  "meta": {
    "requestId": "req_003",
    "timestamp": "2026-07-27T10:30:00Z",
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### POST /api/v1/project/projects/{id}/milestones

**Request:**
```json
{
  "name": "Design Complete",
  "sequence": 2,
  "target_date": "2026-09-15"
}
```

### POST /api/v1/project/tasks/{id}/transition

**Request:**
```json
{
  "action": "complete",
  "reason": "Design review passed all criteria"
}
```

---

## Engineering Domain

### POST /api/v1/engineering/designs

**Request:**
```json
{
  "project_id": "proj_001"
}
```

### POST /api/v1/engineering/designs/{id}/upload

**Request:** `multipart/form-data`
```
file: [CAD file binary]
metadata: {
  "format": "STEP",
  "cad_version": "2024",
  "author": "user_123",
  "notes": "Initial cavity layout"
}
```

### POST /api/v1/engineering/boms

**Request:**
```json
{
  "project_id": "proj_001",
  "design_id": "des_001"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "bom_001",
    "project_id": "proj_001",
    "design_id": "des_001",
    "version": 1,
    "status": "draft",
    "items": [],
    "created_at": "2026-07-27T10:30:00Z"
  },
  "meta": { "requestId": "req_004", "timestamp": "2026-07-27T10:30:00Z" }
}
```

### POST /api/v1/engineering/boms/{id}/items

**Request:**
```json
{
  "parent_item_id": null,
  "part_number": "PLT-001",
  "description": "Top Plate - P20 Steel",
  "quantity": 1,
  "unit": "pcs",
  "material": "P20",
  "specification": {
    "thickness": 50,
    "finish": "ground",
    "hardness": "HRC 38-42"
  }
}
```

### POST /api/v1/engineering/engineering-changes

**Request:**
```json
{
  "project_id": "proj_001",
  "reason": "Customer requested material upgrade from P20 to H13",
  "affected_entities": [
    { "type": "design", "id": "des_001", "description": "Cavity insert design" },
    { "type": "bom_item", "id": "bi_001", "description": "Cavity insert material" }
  ]
}
```

---

## Manufacturing Domain

### POST /api/v1/manufacturing/plans

**Request:**
```json
{
  "project_id": "proj_001",
  "scheduled_start": "2026-09-16T08:00:00Z",
  "scheduled_end": "2026-11-01T17:00:00Z"
}
```

### POST /api/v1/manufacturing/work-orders

**Request:**
```json
{
  "project_id": "proj_001",
  "production_plan_id": "pp_001",
  "bom_item_id": "bi_001",
  "machine_id": "m_001",
  "quantity_planned": 4,
  "scheduled_start": "2026-09-20T08:00:00Z",
  "scheduled_end": "2026-09-22T17:00:00Z",
  "assigned_operator": "user_456"
}
```

### POST /api/v1/manufacturing/work-orders/{id}/runs

**Request:**
```json
{
  "start_time": "2026-09-20T08:00:00Z",
  "end_time": "2026-09-20T16:30:00Z",
  "quantity_produced": 4,
  "quantity_scrapped": 0,
  "notes": "All dimensions within tolerance"
}
```

### POST /api/v1/manufacturing/trials

**Request:**
```json
{
  "project_id": "proj_001",
  "trial_date": "2026-11-05",
  "parameters": {
    "cycle_time_sec": 45,
    "injection_pressure_bar": 1200,
    "mold_temp_c": 80,
    "material_temp_c": 220
  },
  "notes": "First shot trial"
}
```

---

## Quality Domain

### POST /api/v1/quality/inspection-plans

**Request:**
```json
{
  "project_id": "proj_001",
  "name": "Cavity Insert Dimensional Check",
  "checkpoints": [
    { "sequence": 1, "parameter": "Length", "tolerance": "±0.05mm", "method": "CMM" },
    { "sequence": 2, "parameter": "Surface Finish", "tolerance": "Ra 0.8", "method": "Profilometer" }
  ]
}
```

### POST /api/v1/quality/inspection-results

**Request:**
```json
{
  "inspection_plan_id": "ip_001",
  "work_order_id": "wo_001",
  "measurements": [
    { "checkpoint": 1, "measured_value": "120.02mm", "pass": true },
    { "checkpoint": 2, "measured_value": "Ra 0.76", "pass": true }
  ],
  "inspector_id": "user_789"
}
```

### POST /api/v1/quality/ncrs

**Request:**
```json
{
  "project_id": "proj_001",
  "inspection_result_id": "ir_001",
  "defect_type": "dimensional_deviation",
  "severity": "major",
  "description": "Cavity insert length measures 119.85mm vs spec 120.00±0.05mm"
}
```

### POST /api/v1/quality/capas

**Request:**
```json
{
  "project_id": "proj_001",
  "ncr_id": "ncr_001",
  "root_cause": "Tool wear on CNC machine M-003 exceeded tolerance threshold",
  "corrective_actions": [
    { "description": "Replace tool insert on M-003", "assigned_to": "user_456", "due_date": "2026-09-25" }
  ],
  "preventive_actions": [
    { "description": "Update tool wear monitoring schedule to weekly", "assigned_to": "user_456", "due_date": "2026-10-01" }
  ]
}
```

---

## Service Domain

### POST /api/v1/service/dispatch

**Request:**
```json
{
  "project_id": "proj_001",
  "dispatch_date": "2026-12-16",
  "carrier": "FreightCo Express",
  "tracking_number": "FC-987654321"
}
```

### POST /api/v1/service/service-requests

**Request:**
```json
{
  "project_id": "proj_001",
  "issue": "Ejector pins sticking after 10,000 cycles",
  "priority": "high"
}
```

---

## Security Domain

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "user@mitra.local",
  "password": "securePassword123!"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "user": {
      "id": "u_abc123",
      "email": "user@mitra.local",
      "display_name": "John Engineer",
      "roles": ["engineer", "project_lead"]
    }
  },
  "meta": { "requestId": "req_auth_001", "timestamp": "2026-07-27T10:30:00Z" }
}
```

### POST /api/v1/auth/refresh

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### GET /api/v1/security/users/me

**Response (200):**
```json
{
  "data": {
    "id": "u_abc123",
    "email": "user@mitra.local",
    "display_name": "John Engineer",
    "roles": [
      { "name": "engineer", "scope": null },
      { "name": "project_lead", "scope": "project", "project_id": "proj_001" }
    ],
    "permissions": {
      "engineering:design": ["create", "read", "update"],
      "project:project": ["read"],
      "project:task": ["create", "read", "update"]
    }
  },
  "meta": { "requestId": "req_005", "timestamp": "2026-07-27T10:30:00Z" }
}
```

---

## Common Error Responses

### 400 — Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Name is required", "code": "REQUIRED" },
      { "field": "email", "message": "Invalid email format", "code": "INVALID_FORMAT" }
    ],
    "requestId": "req_006",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 401 — Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "requestId": "req_007",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 403 — Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access this resource",
    "requestId": "req_008",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 404 — Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": [{ "field": "id", "message": "No design found with id: des_999" }],
    "requestId": "req_009",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 409 — Conflict
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot approve: Design is already in approved state",
    "requestId": "req_010",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### 422 — Business Rule Violation
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot release work order: Machine M-003 is under maintenance",
    "requestId": "req_011",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

---

## Endpoint Summary

| Domain | Resource | Create | Read (List) | Read (One) | Update | Delete | Actions |
|--------|----------|--------|-------------|------------|--------|--------|---------|
| Commercial | /customers | POST | GET | GET/{id} | PUT/{id} | DELETE/{id} | - |
| Commercial | /contacts | POST | GET | - | PUT/{id} | - | - |
| Commercial | /rfqs | POST | GET | GET/{id} | PUT/{id} | - | submit, quote |
| Commercial | /quotations | POST | GET | GET/{id} | PUT/{id} | - | send, accept, reject |
| Project | /projects | POST | GET | GET/{id} | PUT/{id} | - | transition |
| Project | /milestones | POST | GET | - | PUT/{id} | - | complete |
| Project | /tasks | POST | GET | - | PUT/{id} | - | transition |
| Engineering | /designs | POST | GET | GET/{id} | PUT/{id} | - | upload, submit, approve, request-changes |
| Engineering | /boms | POST | GET | GET/{id} | - | - | release, revise, compare |
| Engineering | /bom-items | POST | - | - | PUT/{id} | DELETE/{id} | - |
| Engineering | /engineering-changes | POST | GET | GET/{id} | - | - | approve |
| Manufacturing | /plans | POST | GET | GET/{id} | - | - | - |
| Manufacturing | /machines | - | GET | - | PUT/{id} | - | - |
| Manufacturing | /work-orders | POST | GET | GET/{id} | - | - | release, start, complete, report-issue |
| Manufacturing | /runs | POST | GET | - | - | - | - |
| Manufacturing | /trials | POST | GET | - | - | - | record |
| Quality | /inspection-plans | POST | GET | GET/{id} | - | - | - |
| Quality | /inspection-results | POST | GET | GET/{id} | - | - | - |
| Quality | /ncrs | POST | GET | GET/{id} | - | - | investigate, action, close, escalate |
| Quality | /capas | POST | GET | - | - | - | start, verify, close |
| Quality | /capa-actions | - | - | - | PUT/{id} | - | - |
| Service | /dispatch | POST | GET | - | PUT/{id} | - | - |
| Service | /installations | POST | GET | - | - | - | accept |
| Service | /maintenance | POST | GET | - | - | - | - |
| Service | /service-requests | POST | GET | - | PUT/{id} | - | resolve |
| Service | /warranties | - | GET | - | - | - | - |
| Service | /warranty-claims | POST | GET | - | - | - | approve, reject |
| Service | /spare-parts | - | GET | - | - | - | adjust |
| Analytics | /dashboards | - | GET | GET/{id} | - | - | - |
| Analytics | /kpis | - | GET | GET/{id} | - | - | - |
| Analytics | /reports | - | GET | - | - | - | generate |
| Auth | /auth | - | - | - | - | - | login, refresh |
| Security | /users/me | - | - | GET | - | - | - |
