# API Standards

## Purpose

This document defines the REST API design standards for MITRA. Consistent API design ensures that every domain service follows the same conventions, reducing cognitive load for frontend developers and API consumers.

---

## Base URL

```
/api/v1/{domain}/{resource}
```

Example: `/api/v1/project/projects`, `/api/v1/engineering/designs`

---

## HTTP Methods

| Method | Semantics | Idempotent | Body |
|--------|-----------|------------|------|
| `GET` | Retrieve resource(s) | Yes | No |
| `POST` | Create resource | No | Yes |
| `PUT` | Full replacement | Yes | Yes |
| `PATCH` | Partial update | No | Yes |
| `DELETE` | Remove resource | Yes | No |

### Usage Rules

- **GET** must never modify state.
- **POST** returns `201 Created` with the created resource.
- **PUT** replaces the entire resource — all fields must be provided.
- **PATCH** accepts a partial JSON body — only provided fields are updated.
- **DELETE** returns `204 No Content`.
- **PUT/PATCH responses** return the updated resource (`200 OK`).

---

## URL Naming

### Conventions

| Pattern | Example |
|---------|---------|
| `/{resources}` | `/projects` |
| `/{resources}/{id}` | `/projects/{id}` |
| `/{resources}/{id}/{subresources}` | `/projects/{id}/milestones` |
| `/{resources}/{id}/{subresources}/{subId}` | `/projects/{id}/milestones/{milestoneId}` |

### Rules

- **Plural nouns** for collection resources: `/projects`, `/designs`, `/work-orders`.
- **Lowercase with hyphens** for multi-word resources: `/work-orders`, `/process-plans`.
- **Nesting up to 2 levels deep.** Beyond that, use query parameters or a dedicated endpoint.
- **No verbs in URLs.** Actions are expressed via HTTP methods or dedicated action endpoints (`/{resource}/{id}/submit`, `/{resource}/{id}/approve`).

### Action Endpoints

For state transitions that don't map cleanly to CRUD:

```
POST /{resource}/{id}/submit
POST /{resource}/{id}/approve
POST /{resource}/{id}/reject
POST /{resource}/{id}/cancel
```

Action endpoints return `200 OK` with the updated resource.

---

## Request/Response Formats

### Content Type

- Requests: `application/json`
- Responses: `application/json`
- File uploads: `multipart/form-data`

### Standard Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

### Collection Response

```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-07-27T10:30:00Z",
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required",
        "code": "REQUIRED"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2026-07-27T10:30:00Z"
  }
}
```

---

## DTO Rules

### Request DTOs

- Every mutation endpoint has a typed DTO.
- Validation uses `class-validator` decorators:
  - `@IsString()`, `@IsOptional()`, `@IsUUID()`, `@IsEnum()`, `@IsArray()`, `@ValidateNested()`
  - `@MinLength()`, `@MaxLength()`, `@IsDateString()`, `@IsNumber()`, `@Min()`, `@Max()`
- DTOs are exported and reusable by frontend type generation.

### Response DTOs

- Response DTOs exclude internal fields (e.g., `password_hash`).
- Timestamps are ISO 8601 strings in UTC.
- UUIDs are strings.
- Relations are represented as IDs, not nested objects (unless explicitly requested via `?include=`).

---

## Error Model

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful GET, PUT, PATCH |
| `201` | Successful POST (resource created) |
| `204` | Successful DELETE |
| `400` | Validation error, malformed request |
| `401` | Authentication required |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate, state conflict) |
| `422` | Unprocessable entity (business rule violation) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Input failed validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `CONFLICT` | 409 | State conflict (e.g., already approved) |
| `BUSINESS_RULE_VIOLATION` | 422 | Operation violates domain rule |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Pagination

### Request

```
GET /api/v1/project/projects?page=1&pageSize=20&sort=created_at:desc
```

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | - | Page number (1-indexed) |
| `pageSize` | 20 | 100 | Items per page |
| `sort` | `created_at:desc` | - | `field:direction` format |

### Response

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

- **Cursor-based pagination** may be used for high-volume endpoints (e.g., audit log). Parameters: `?cursor={id}&limit=20`. Response includes `nextCursor`.

---

## Filtering

### Request

```
GET /api/v1/project/projects?status=engineering&priority=high
GET /api/v1/project/projects?created_at.gte=2026-01-01&created_at.lte=2026-06-30
```

| Suffix | Operator | Example |
|--------|----------|---------|
| `.eq` | Equals | `status=active` (default) |
| `.ne` | Not equals | `status.ne=cancelled` |
| `.gt` | Greater than | `quantity.gt=100` |
| `.gte` | Greater than or equal | `created_at.gte=2026-01-01` |
| `.lt` | Less than | `amount.lt=50000` |
| `.lte` | Less than or equal | `delivery_date.lte=2026-12-31` |
| `.in` | In list | `status.in=engineering,manufacturing` |
| `.like` | Pattern match | `name.like=%mold%` |

---

## Sorting

```
?sort=field:direction
```

- Default: `created_at:desc`
- Multiple: `?sort=status:asc,created_at:desc`
- Supported directions: `asc`, `desc`

---

## Versioning

### URL Versioning

```
/api/v1/projects          -- current stable version
/api/v2/projects          -- next major version (when needed)
```

### Version Policy

- **Breaking changes** (field removal, type change, URL restructuring) → new major version.
- **Non-breaking additions** (new optional field, new endpoint) → no version bump.
- **Deprecation** — old version remains available for at least 3 months with a `Deprecation` header.
- **Sunset header** — `Sunset: Sat, 27 Oct 2026 23:59:59 GMT` indicates when a version will be removed.

---

## Authentication

### Header

```
Authorization: Bearer {jwt_token}
```

### Response Headers

```
X-Request-Id: req_abc123
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1722071400
```

### Rate Limiting

- **Anonymous:** 10 req/min
- **Authenticated:** 100 req/min
- **Burst:** 20 req/sec (retry after 429 with `Retry-After` header)

---

## Common Headers

| Header | When | Description |
|--------|------|-------------|
| `Authorization` | Required | Bearer JWT token |
| `Idempotency-Key` | Recommended (POST/PATCH) | Prevents duplicate processing |
| `If-Match` | Optional (PUT/PATCH) | ETag-based optimistic concurrency |
| `Accept-Language` | Optional | Locale for error messages |

---

## API Documentation

- Every endpoint must have a Swagger/OpenAPI decorator (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- Auto-generated OpenAPI spec at `/api/docs` (Swagger UI).
- DTOs are the source of truth for request/response schemas.

---

## Consistency Rules

1. **Every list endpoint** supports pagination, filtering, and sorting.
2. **Every mutation endpoint** returns the full resource representation.
3. **Every error response** includes a machine-readable `code` and human-readable `message`.
4. **Timestamps** are always ISO 8601 in UTC (suffix: `Z`).
5. **UUIDs** are always 36-character lowercase hex strings.
6. **No sensitive data** in URLs (query parameters, path segments).
7. **Idsempotency** — POST endpoints that create resources should accept an `Idempotency-Key` header to prevent duplicate creation on retry.
