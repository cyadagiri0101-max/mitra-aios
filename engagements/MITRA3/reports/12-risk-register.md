---
id: MITRA3-RISK-REGISTER
title: Updated Risk Register
type: REPORT
layer: 3
version: 1.0
status: PUBLISHED
author: [Independent Engineering Review Board]
created: 2026-07-18
engagement: MITRA3
assurance_level: L2
---

# Updated Risk Register

## Risk Scoring

| Severity | Likelihood | Impact |
|----------|------------|--------|
| CRITICAL | Almost certain | Data loss / Security breach |
| HIGH | Probable | Operational degradation |
| MEDIUM | Possible | Minor impact |
| LOW | Unlikely | Negligible |

---

## Risk 1: In-Memory Token Store

| Field | Value |
|-------|-------|
| **Risk** | Tokens are stored in memory only (`TokenManager._tokens: dict`). Process restart invalidates all tokens. |
| **Severity** | HIGH |
| **Likelihood** | HIGH (every restart) |
| **Impact** | All clients must re-authenticate after restart |
| **Affected files** | `src/aios/security/token.py` |
| **Owner** | Security Architect |
| **Status** | ACCEPTED (architectural decision for RC) |
| **Mitigation** | None in current release |
| **Residual risk** | HIGH — no persistence of auth sessions |

## Risk 2: No JWT Standard Compliance

| Field | Value |
|-------|-------|
| **Risk** | "JWT" token type is a simplified random-string format, not actual JSON Web Tokens. No JWT signing, no `jwt` library, no `iat`/`iss`/`aud` claims. |
| **Severity** | MEDIUM |
| **Likelihood** | LOW |
| **Impact** | Cannot interoperate with standard JWT consumers, no claim-based authorization |
| **Affected files** | `src/aios/security/token.py:74-80` |
| **Owner** | Security Architect |
| **Status** | ACCEPTED |
| **Mitigation** | Token format is internal-only |
| **Residual risk** | MEDIUM |

## Risk 3: CORS Wildcard with Credentials

| Field | Value |
|-------|-------|
| **Risk** | `allow_origins=["*"]` with `allow_credentials=True`. Per CORS spec, this combination is invalid — browsers will ignore the wildcard when credentials are involved. |
| **Severity** | HIGH |
| **Likelihood** | MEDIUM |
| **Impact** | Browser-based clients may fail to authenticate; or, if a browser doesn't enforce the spec, any origin can make credentialed requests. |
| **Affected files** | `src/aios/api/app.py:26-28,42-44` |
| **Owner** | DevOps Lead |
| **Status** | **RESOLVED** |
| **Mitigation** | Added `_parse_origins()` helper; env-var driven origins; credentials disabled for wildcard |
| **Residual risk** | LOW |

## Risk 4: Ruff Lint Errors in Test Files

| Field | Value |
|-------|-------|
| **Risk** | 219 ruff errors, all in test files referencing removed legacy module classes (F821 undefined names). CI lint job only checks `src/` so these don't fail CI, but they indicate test code rot. |
| **Severity** | MEDIUM |
| **Likelihood** | LOW (tests are excluded via `__test__ = False`) |
| **Impact** | Cannot easily re-enable phase4 tests without fixing imports |
| **Affected files** | `tests/test_phase4.py`, `tests/test_phase4_2_integration.py`, `tests/test_phase4_3_failure_injection.py` |
| **Owner** | QA Lead |
| **Status** | DEFERRED |
| **Mitigation** | Tests excluded via `__test__ = False` on parent classes |
| **Residual risk** | LOW |

## Risk 5: Mypy Type Errors (None Checks)

| Field | Value |
|-------|-------|
| **Risk** | 187 mypy errors across the codebase. 21 None-check errors in `routes.py` were fixed by adding `_checked()` helper. 187 pre-existing errors remain (wrong signatures, attribute mismatches, etc.) |
| **Severity** | MEDIUM |
| **Likelihood** | LOW (pre-existing issues, not runtime-crash related after fix) |
| **Impact** | Code quality and type safety gaps |
| **Affected files** | `src/aios/api/routes.py` (fixed), multiple other files (pre-existing) |
| **Owner** | Principal Software Engineer |
| **Status** | **PARTIALLY RESOLVED** |
| **Mitigation** | 21 critical None-check errors in routes.py fixed; CI continues with `continue-on-error: true` |
| **Residual risk** | LOW |

## Risk 6: Auto-Generated Encryption Key

| Field | Value |
|-------|-------|
| **Risk** | If `AIOS_ENCRYPTION_KEY` is not set, a random key is generated on every start. All previously encrypted data becomes undecipherable. |
| **Severity** | CRITICAL |
| **Likelihood** | MEDIUM |
| **Impact** | Permanent data loss |
| **Affected files** | `src/aios/security/manager.py:36`, `src/aios/security/encryption.py:27-28` |
| **Owner** | Security Architect |
| **Status** | ACCEPTED (mitigated) |
| **Mitigation** | Warning logged on auto-generation; documented in `.env.example` |
| **Residual risk** | HIGH — depends on operational discipline |

## Risk 7: Dependency Scan Not Blocking

| Field | Value |
|-------|-------|
| **Risk** | CI `pip-audit` step uses `continue-on-error: true`. Known vulnerabilities in dependencies will not block CI. |
| **Severity** | MEDIUM |
| **Likelihood** | LOW |
| **Impact** | Vulnerable dependencies could ship in a release |
| **Affected files** | `.github/workflows/ci.yml` |
| **Owner** | DevSecOps Lead |
| **Status** | DEFERRED |
| **Mitigation** | Scanning is performed but not enforced |
| **Residual risk** | MEDIUM |

## Risk 8: No Backup/DR Capability

| Field | Value |
|-------|-------|
| **Risk** | No backup module, no disaster recovery procedures documented. Data stored by `PersistenceStore` on local filesystem is at risk. |
| **Severity** | HIGH |
| **Likelihood** | LOW |
| **Impact** | Permanent data loss on hardware failure |
| **Affected files** | N/A (missing capability) |
| **Owner** | DevOps Lead |
| **Status** | DEFERRED |
| **Mitigation** | None |
| **Residual risk** | HIGH |

---

## Risk Summary

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | In-memory token store | HIGH | ACCEPTED |
| 2 | No JWT standard compliance | MEDIUM | ACCEPTED |
| 3 | CORS wildcard with credentials | **HIGH** | **RESOLVED** |
| 4 | Lint errors in test files | MEDIUM | DEFERRED |
| 5 | Mypy None-check errors | **MEDIUM** | **PARTIALLY RESOLVED** |
| 6 | Auto-generated encryption key | CRITICAL | ACCEPTED (mitigated) |
| 7 | Dependency scan not blocking | MEDIUM | DEFERRED |
| 8 | No backup/DR capability | HIGH | DEFERRED |
