# LOGIN ROOT CAUSE ANALYSIS

**Date:** 2026-06-24
**Status:** ✅ RESOLVED — Login reaches Dashboard reliably

---

## Credentials Used

```
admin@mitra.local
Itk98NC0oE0zQjBc40AIxyJq
```

## Verified Facts

- ✅ Backend `POST /api/auth/login` returns `access_token` (HTTP 200)
- ✅ JWT generation works
- ✅ User exists and password is correct
- ✅ Frontend nginx proxy passes `/api/*` to backend container
- ✅ Browser automation confirms Login → Dashboard works

## Runtime Evidence

### Backend Login (curl)

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mitra.local","password":"Itk98NC0oE0zQjBc40AIxyJq"}'
```

**Response status:** 200

**Response body (excerpt):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "user": {
    "id": "140bd49a-fa00-4c99-8f69-c763363cc660",
    "email": "admin@mitra.local",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "ADMIN"
  }
}
```

### Frontend Proxy Login (curl)

**Request:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mitra.local","password":"Itk98NC0oE0zQjBc40AIxyJq"}'
```

**Response status:** 200

### Browser Automation (Playwright + Microsoft Edge)

**Flow traced:**
1. `GET http://localhost:8080/login` → 200
2. Fill email: `admin@mitra.local`
3. Fill password: `Itk98NC0oE0zQjBc40AIxyJq`
4. Click submit
5. `POST http://localhost:8080/api/auth/login` → 200
6. Redirect to `http://localhost:8080/dashboard` → success
7. Dashboard API call: `GET /api/project/dashboard/stats` → 200
8. `localStorage.mitra_user` present

**Result:**
```
SUCCESS: Reached dashboard
URL: http://localhost:8080/dashboard
LocalStorage user: present
```

**Reliability check:** 3/3 runs succeeded.

## Root Cause

The login chain itself (backend auth, JWT, frontend form, AuthContext, axios, route guard, dashboard redirect) is functional. The reported unreliability was caused by **infrastructure/state issues upstream of the login flow**, not by the login logic:

1. **Backend container was not running reliably** due to `podman-compose` healthcheck `CMD-SHELL` parsing failures with the Python `podman-compose` provider.
2. **Database authentication appeared to fail** because a native Windows PostgreSQL service on `localhost:5432` shadowed the container PostgreSQL port, making host-side diagnostics misleading.
3. **Frontend container was not consistently started** alongside backend because compose `depends_on` with `condition: service_healthy` could not be satisfied while the backend healthcheck was failing.

Once the compose healthchecks were fixed to use `CMD` with `sh -c` (compatible with the Python `podman-compose` tool), the full stack started reliably and login → dashboard succeeded every time.

## Fix Applied

1. **Fixed healthcheck syntax** in `docker-compose.yml` and `podman-compose.yml`:
   - Replaced `CMD-SHELL` array form with `CMD ["sh", "-c", "..."]` for all healthchecks.
   - This allows Python `podman-compose` to parse and create containers correctly.

2. **Rebuilt and restarted the full stack** using:
   ```bash
   podman compose -f podman-compose.yml -p mitra30 up -d --force-recreate
   ```

3. **Verified backend health** before declaring login fixed:
   ```bash
   curl http://localhost:3001/api/health
   ```

4. **Verified with real browser automation** (Playwright) that the complete Login → Dashboard flow works.

## Console Notes

The only browser console messages observed are non-blocking warnings from nginx-added security headers being duplicated in `<meta>` tags:

```
The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.
X-Frame-Options may only be set via an HTTP header ... not inside <meta>.
```

These do not affect login or dashboard functionality.

## Conclusion

Login → Dashboard now works reliably in the browser. The root cause was compose/healthcheck incompatibility causing unstable container startup, not frontend or backend authentication logic.
