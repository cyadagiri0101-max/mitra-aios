# MITRA v4.1 Post-Release Login Redirect Failure - Investigation & Resolution Report

**Date:** 2026-08-14
**Target Version:** MITRA v4.1.0 (Post-Release Runtime Defect Investigation)
**Release Commit:** `e190362a939ff5b44f27b5c4efe9c19223f23bdd`
**Release Tag:** `v4.1.0` (Local tag preserved; v4.1.1 tag pending authorization)

---

## Executive Summary

Following local release tag `v4.1.0`, a runtime login redirect failure was reported where attempting to log in on `http://localhost:3000/login` appeared to execute but returned the user immediately to `/login` without reaching `/dashboard`.

Investigation established **two compounding root causes**:
1. **Runtime Database Account Lockout & Rate Limit (Database & Runtime State):**
   - The seed admin account (`admin@mitra.local`) in the production database (`mitra_v2`) had `failed_login_attempts` set to 5 and `locked_until` set to `2026-08-14T06:43:26.572Z` due to prior test suite runs.
   - The backend `AuthService` rejected login requests with **HTTP 401 Unauthorized** (*"Account is locked due to multiple failed login attempts."*).
   - In addition, the NestJS `ThrottlerGuard` reached its 10-request limit from `127.0.0.1`, returning **HTTP 429 Too Many Requests** (`retry-after: 603` seconds).
   - Because the login API call threw 401/429 errors, `AuthContext` state remained unauthenticated (`user = null`, `accessToken = null`), triggering `<ProtectedRoute />` to redirect back to `/login`.

2. **Frontend Auth Context Initialization Race Condition (Source Code Defect):**
   - In `mitra-frontend/src/context/AuthContext.tsx`, `loadStoredToken()` read `localStorage.getItem('mitra_access_token')` but did **not** call `setAccessToken(token)` synchronously during state initialization.
   - On page refresh or mount, the `useEffect(..., [])` hook called `api.get('/auth/me')` before the token sync effect ran, sending `/auth/me` without the `Authorization: Bearer <token>` header.
   - The backend returned HTTP 401, causing `AuthContext` to clear `localStorage` and force a redirect to `/login`.

---

## Repository State (Phase 0)

- **Branch:** `v3.3`
- **HEAD Commit:** `e190362a939ff5b44f27b5c4efe9c19223f23bdd` (`release: MITRA v4.1 final`)
- **Tags at HEAD:** `v4.1.0`
- **Initial Working Tree State:** Clean.

---

## Service Verification (Phase 1)

- **Frontend Server:** Active on `http://localhost:3000` (PID 101552, `node.exe` Vite dev server).
- **Backend API:** Active on `http://localhost:3001` (PID 240, `node.exe` NestJS host production process).
- **Health Endpoint:** `GET http://localhost:3001/api/health` -> `HTTP 200 OK` (`status: ok`, `database: up`).

---

## Complete Login Flow Trace (Phase 2)

```text
User Submits Login Form (LoginPage.tsx)
  |
  v
login(email, password, { redirectTo: null })  [AuthContext.tsx]
  |
  v
POST /api/auth/login  [via Vite proxy to http://localhost:3001]
  |
  +-> [Failure Case 1]: DB Account Locked (locked_until active) -> HTTP 401 Unauthorized
  +-> [Failure Case 2]: IP Rate Limit Reached (ThrottlerGuard) -> HTTP 429 Too Many Requests
  |     +-> login() throws error -> user state stays null -> redirect to /login
  |
  +-> [Success Case]: HTTP 200 OK -> returns { access_token, user }
        |
        v
  setAccessTokenState(access_token) & setAccessToken(access_token)
        |
        v
  localStorage.setItem('mitra_user', enrichedUser)
        |
        v
  LoginPage handles LaunchSequence (setPhase('done') after 2.4s)
        |
        v
  navigate('/dashboard', { replace: true })
        |
        v
  <ProtectedRoute /> checks isAuthenticated (!!accessToken && !!user)
        |
        +-> If true  --> Renders <DashboardPage />
        +-> If false --> Redirects to /login
```

---

## Direct Backend Auth Diagnostic (Phase 4)

1. **Initial Call (Account Locked & Rate Limited):**
   - `POST /api/auth/login` with `admin@mitra.local` -> `HTTP 401 Unauthorized` (`"Account is locked..."`) & `HTTP 429 Too Many Requests`.
2. **Database State Inspection (`mitra_v2`):**
   - `email`: `admin@mitra.local`
   - `status`: `active`
   - `failed_login_attempts`: `5`
   - `locked_until`: `2026-08-14T06:43:26.572Z`
   - `password_hash`: verified match with `E2eAdminPass!2026` via bcryptjs.
3. **Database Remediation:**
   - Executed: `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = 'admin@mitra.local';`
4. **Post-Unlock Direct Call:**
   - `POST /api/auth/login` -> `HTTP 200 OK`
   - Payload: `{ access_token: "...", refresh_token: "...", user: { email: "admin@mitra.local", role: "ADMIN" } }`
   - `GET /api/auth/me` with `Authorization: Bearer <access_token>` -> `HTTP 200 OK`
   - Returned keys: `[ 'id', 'email', 'tenantId', 'role', 'roles', 'permissions' ]`

---

## AuthContext Refresh Sequence Verification

```text
loadStoredToken()
    |
    v
token read from localStorage
    |
    v
setAccessToken(token) synchronously [Axios defaults & currentAccessToken updated]
    |
    v
/auth/me requested
    |
    v
Authorization: Bearer <token> header present
    |
    v
HTTP 200 OK returned
    |
    v
authenticated state (user & accessToken non-null)
    |
    v
<DashboardPage /> rendered without redirect to /login
```

---

## Root Cause Classification (Phase 11)

- **G. Auth initialization race condition** (in `AuthContext.tsx`)
- **L. Backend authentication runtime state** (database account lockout `locked_until` on `admin@mitra.local`)
- **J. CORS/cookie/rate-limiter configuration** (`ThrottlerGuard` IP limit hit during automated test runs)

---

## Applied Minimal Fix (Phase 12)

### File Modified
- `mitra-frontend/src/context/AuthContext.tsx`

### Diff
```diff
 function loadStoredToken(): string | null {
   try {
-    return localStorage.getItem('mitra_access_token');
+    const token = localStorage.getItem('mitra_access_token');
+    if (token) {
+      setAccessToken(token);
+    }
+    return token;
   } catch { return null; }
 }
```

---

## Verification Results (Two Distinct Classifications)

### 1. HTTP/API Authentication Flow
- **Result:** **PASS — 8/8**
- **Details:** Direct HTTP API execution of login, `/auth/me` profile retrieval, page-refresh token re-hydration simulation, protected resource access (`/project/projects`), logout (`/auth/logout`), and unauthenticated rejection (401) all passed cleanly.

### 2. Actual Browser Authentication Flow
- **Result:** **PASS — 10/10**
- **Step Breakdown:**
  1. Open `http://localhost:3000/login` -> Renders login form cleanly.
  2. Enter credentials (`admin@mitra.local`) -> Input accepted.
  3. Click Login -> Form submits to backend proxy.
  4. Post-Login Navigation -> URL leaves `/login` and renders Command Center Dashboard (`/dashboard`).
  5. Network Verification -> `POST /api/auth/login` (HTTP 200 OK), `GET /api/auth/me` (HTTP 200 OK with Bearer credential).
  6. **Real Browser Refresh (Ctrl+R / F5):** `loadStoredToken()` reads token from `localStorage`, calls `setAccessToken(token)` synchronously before mount `useEffect`, sends `GET /api/auth/me` with `Authorization: Bearer <token>`, returns **HTTP 200 OK**, browser stays on `/dashboard` without returning to `/login`.
  7. Protected Route Navigation -> `/projects` loads protected project domain data cleanly.
  8. Back Navigation -> `/dashboard` renders without auth loss.
  9. Logout -> `POST /api/auth/logout` clears `localStorage` and resets state; user is redirected to `/login`; direct URL access to `/projects` is rejected by `ProtectedRoute`.
  10. Re-Login -> User can log in again and reach `/dashboard`.

---

## Final Decision

```text
BROWSER LOGIN REGRESSION VERIFIED
```

- Tag `v4.1.0` remains unchanged.
- Fix verified in `mitra-frontend/src/context/AuthContext.tsx`.
- Candidate ready for `v4.1.1` patch commit/tag upon explicit user authorization.
