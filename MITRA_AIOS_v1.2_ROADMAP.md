# MITRA AIOS v1.2 Roadmap

**Document Version**: 1.0  
**Date**: 2026-07-17  
**Author**: Principal Software Architect  
**Status**: DRAFT  
**Audience**: Engineering Leadership, Product Management, Development Teams

---

## Executive Summary

MITRA AIOS v1.1.0 has successfully completed RC acceptance: repository audit, production completion, architecture validation, integration testing, failure injection, interface validation, performance benchmarking, packaging validation. The system is production-ready with caveats.

This roadmap defines the v1.2 release cycle (target: 2026-Q3). The strategy prioritises **architectural consolidation** and **developer experience** over new feature surface, ensuring the dual-system architecture (AIOS Python runtime + MITRA v3.2 platform) converges toward a unified, maintainable, and observable codebase.

**Three strategic pillars underpin v1.2:**

1. **Resolve structural debt** — Eliminate duplicated subsystems (config, event bus, memory) and close lifecycle gaps
2. **Production hardening** — Activate dormant security controls, add CI/CD for all components, establish release governance
3. **Foundational features** — Introduce capabilities that unlock the v1.3+ roadmap (distributed execution, MCP, observability dashboard) without destabilising the v1.1 baseline

**Total estimated effort**: 18-24 engineering-weeks across 10 milestones.

---

## Phase 1 — Technical Debt Backlog

Prioritised by impact on stability, maintainability, and developer velocity. Items that were accepted for v1.1.0 are excluded.

### P0 — Critical (Address in v1.2.0-alpha / Sprint 1-2)

| ID | Item | Description | Impact | Effort | Recommended Target |
|----|------|-------------|--------|--------|-------------------|
| T-001 | Silent exception swallowing | `src/aios/api/stack.py:120-204` — 12 `try/except Exception: pass` blocks mask initialisation failures for optional managers | Production failures go undetected; cascading failures in dependent modules | 2d | v1.2.0-alpha |
| T-002 | Dual config systems | `src/aios/core/config.py` (legacy) co-exists with `src/aios/config/manager.py` (new). Settings can be read/written via two paths with different merge semantics | Configuration drift, inconsistent behaviour depending on load path | 3d | v1.2.0-alpha |
| T-003 | Dual event bus systems | `src/aios/events/bus.py` (sync, simple) and `src/aios/eos/event_bus.py` (priority, async, sophisticated) with incompatible interfaces | Event loss, confusion for plugin developers, duplicated maintenance | 4d | v1.2.0-alpha |
| T-004 | Dual memory systems | `src/aios/memory/engine.py` and `src/aios/memory/memory_manager.py` with overlapping but incompatible APIs | Data fragmentation, inconsistent recall, increased cognitive load | 4d | v1.2.0-alpha |
| T-005 | Auth disabled by default | `src/aios/api/auth.py:16` — `_AUTH_ENABLED = False`; authentication is opt-in with no production warning | Any deployment forgetting to enable auth is fully exposed | 2d | v1.2.0-alpha |
| T-006 | CORS wide open | `src/aios/api/app.py:34` — `allow_origins=["*"]` | Cross-origin abuse in production deployments | 1d | v1.2.0-alpha |

### P1 — High (Address in v1.2.0-beta / Sprint 3-4)

| ID | Item | Description | Impact | Effort | Recommended Target |
|----|------|-------------|--------|--------|-------------------|
| T-007 | Mock/stub implementations in agent layer | `src/aios/agent/planner.py:31-36` returns hardcoded steps; `executor.py:32-52` returns mock results; `reflection.py:27-34` returns canned response | Agent execution is non-functional in production; defeats purpose of the framework | 5d | v1.2.0-beta |
| T-008 | No CI/CD for NestJS backend or React frontend | Only the Python `aios` package has GitHub Actions. Backend and frontend have no automated lint, typecheck, test, or build pipelines | Regressions undetected; no artefact provenance for backend/frontend releases | 3d | v1.2.0-beta |
| T-009 | Overly large modules | `runtime_engine.py` (1409 lines), `workflow_engine.py` (889 lines), `routes.py` (847 lines), `decision_engine.py` (625 lines) | Reduced maintainability, difficult to review, increased merge conflict risk | 5d | v1.2.0-beta |
| T-010 | No frontend test infrastructure | Frontend has no test framework, no test files, no coverage configuration | Frontend regressions invisible until manual QA | 3d | v1.2.0-beta |
| T-011 | Redis CacheModule commented out in production | `mitra-backend/src/app.module.ts:39,108` — `// CacheModule` disabled | Performance hit under load; caching not available for API responses | 1d | v1.2.0-beta |
| T-012 | No contribution guide or PR/issue templates | No `CONTRIBUTING.md`, no `.github/ISSUE_TEMPLATE/`, no `PULL_REQUEST_TEMPLATE.md` | Ad-hoc contributions; inconsistent issue quality; onboarding friction | 2d | v1.2.0-beta |
| T-013 | No git commit history | Repository is initialised with zero commits | No traceability; no ability to bisect regressions; no release tags | 1d | v1.2.0-beta |
| T-014 | 23 `type: ignore` comments across Python source | Type safety suppressed at 23 locations; many are `[import-untyped]` but several are `[assignment]` and `[arg-type]` | Masked type errors may surface as runtime failures | 3d | v1.2.0-beta |

### P2 — Medium (Address in v1.2.0-rc / Sprint 5-6)

| ID | Item | Description | Impact | Effort | Recommended Target |
|----|------|-------------|--------|--------|-------------------|
| T-015 | Empty documentation directories | `docs/evidence/` and `docs/guides/` exist but contain zero files | User confusion; incomplete documentation navigation | 1d | v1.2.0-rc |
| T-016 | No structured JSON logging in AIOS Python | AIOS uses basic `logging.Logger` with text format; no correlation IDs, no structured context | Hard to parse logs at scale; no correlation across distributed traces | 3d | v1.2.0-rc |
| T-017 | No monitoring stack in deployment config | No Grafana, Prometheus, or alerting included in docker-compose; metrics endpoint exists but no visualisation | Metrics are generated but invisible; no operational insight | 3d | v1.2.0-rc |
| T-018 | Inconsistent lifecycle patterns across managers | Some have `is_initialized` guard, some don't; `reload()` and `shutdown()` implementations vary | Lifecycle bugs; unpredictable behaviour on restart | 3d | v1.2.0-rc |
| T-019 | No pre-commit hooks configured | No linting/formatting enforcement before commits | Code style drift; CI failures due to preventable issues | 1d | v1.2.0-rc |
| T-020 | Orchestrator missing explicit shutdown method | `src/aios/orchestrator.py` has no `shutdown()` or cleanup | Resource leaks on graceful shutdown | 2d | v1.2.0-rc |
| T-021 | Empty `.editorconfig` | File exists but contains no rules | Inconsistent editor behaviour across team | 0.5d | v1.2.0-rc |
| T-022 | Duplicate README files | `README.md` and `README (2).md` coexist with different content | User confusion; stale documentation | 0.5d | v1.2.0-rc |

### P3 — Low (Address in v1.2.x maintenance or defer to v1.3)

| ID | Item | Description | Impact | Effort | Recommended Target |
|----|------|-------------|--------|--------|-------------------|
| T-023 | Import inside methods (lazy imports) | `src/aios/tools/validation.py:23`, `src/aios/agent/agent.py:173` — imports inside function bodies | Minor performance overhead; unconventional pattern | 1d | v1.2.1 |
| T-024 | Hardcoded version string | `src/aios/state/engine.py:219` — `"version": "1.1.0"` hardcoded | Version drift if not updated with each release | 0.5d | v1.2.1 |
| T-025 | No connection pooling configuration | No explicit pool sizes or timeouts for database/Redis connections | Potential connection exhaustion under load | 2d | v1.2.2 |
| T-026 | `object` type annotations in stack.py | `src/aios/api/stack.py:39-50` — many fields typed as `object` instead of concrete types | Reduced IDE support; type unsafety | 1d | v1.2.2 |
| T-027 | Duplicate error handling pattern boilerplate | ~50+ route handlers repeat identical `try/except Exception: raise _http_error(500, str(e))` | Maintenance burden; inconsistent error responses | 4d | v1.3.0 |
| T-028 | No integration tests between AIOS and backend | All tests are unit-level within each subsystem | Cross-system contract breaks undetected until deployment | 5d | v1.3.0 |

---

## Phase 2 — Feature Roadmap

Features selected for v1.2 align with the strategic goal of **enabling distributed, observable, and governable AI execution** without destabilising the v1.1 architecture. Each feature is phased to ensure stable foundation work precedes capability delivery.

### F-001: Unified Configuration System

**User value**: Single source of truth for all settings across AIOS and MITRA backend. CLI, API, and file-based configuration behave identically.

**Architectural impact**: Retire `src/aios/core/config.py`; promote `src/aios/config/manager.py` as the sole config system. Add schema validation (JSON Schema / Pydantic) for all configuration sections.

**Dependencies**: T-002 (Dual config systems)

**Estimated complexity**: 3d

**Implementation phases**:
1. Audit all config consumers and document key set (1d)
2. Migrate consumers to `ConfigManager` API (1d)
3. Deprecate and remove legacy `core/config.py` (0.5d)
4. Add JSON Schema validation for config structure (0.5d)

### F-002: Unified Event System

**User value**: Plugin developers and integrators work with a single event bus API. Events can be dispatched and consumed uniformly across sync and async contexts.

**Architectural impact**: Retire `src/aios/events/bus.py`; promote `src/aios/eos/event_bus.py` as the sole event bus. Add backward-compatibility adapter for legacy consumers.

**Dependencies**: T-003 (Dual event bus systems)

**Estimated complexity**: 4d

**Implementation phases**:
1. Audit all event consumers and document usage patterns (1d)
2. Extend EOS EventBus with any missing capabilities from legacy bus (1d)
3. Add adapter shim for backward compatibility (1d)
4. Migrate consumers and remove legacy bus (1d)

### F-003: Distributed Execution Engine

**User value**: Agents and workflows can be distributed across multiple processes or machines, enabling horizontal scaling and fault isolation.

**Architectural impact**: New `src/aios/distributed/` module with worker pool, task distribution protocol, and result aggregation. Leverages existing `RuntimeEngine` and `TaskQueue`. Requires serialisation protocol for execution plans.

**Dependencies**: F-001, F-002, T-007 (mock agent implementations)

**Estimated complexity**: 10d

**Implementation phases**:
1. Design distributed execution protocol and data models (2d)
2. Implement worker pool with subprocess support (3d)
3. Implement remote worker via WebSocket/gRPC (3d)
4. Add result aggregation, error handling, retry (1d)
5. Integration tests and benchmarks (1d)

### F-004: Advanced Model Routing

**User value**: LLM calls are automatically routed to the optimal provider/model based on task type, cost budget, latency requirements, and availability. Fallback chains ensure resilience.

**Architectural impact**: Enhance `src/aios/llm/manager.py` with routing strategies (cost-aware, latency-aware, capability-aware). Add routing rules engine and telemetry for routing decisions.

**Dependencies**: F-001 (for provider config schema), existing `ProviderRegistry`

**Estimated complexity**: 6d

**Implementation phases**:
1. Define routing strategy interface and built-in strategies (2d)
2. Implement cost-aware and latency-aware routers (2d)
3. Add fallback chain configuration and health-aware routing (1d)
4. Add routing metrics and decision logging (1d)

### F-005: Observability Dashboard

**User value**: Operators gain real-time visibility into system health, LLM usage, execution metrics, and agent activity through a web dashboard.

**Architectural impact**: New React-based dashboard module (or integrate into existing MITRA frontend). Backend exposes Prometheus metrics; dashboard queries metrics endpoint and renders charts. No changes to AIOS core.

**Dependencies**: Existing `MetricsCollector` in `src/aios/observability/metrics.py`

**Estimated complexity**: 8d

**Implementation phases**:
1. Define dashboard wireframes and metric requirements (1d)
2. Add Prometheus metric endpoint (`/metrics`) to AIOS API (1d)
3. Build dashboard frontend with metric visualisation (4d)
4. Add alerting configuration templates (1d)
5. End-to-end testing with load simulation (1d)

### F-006: Kubernetes Support

**User value**: Deploy MITRA AIOS on Kubernetes with Helm charts, readiness probes, resource limits, and horizontal pod autoscaling.

**Architectural impact**: New `deploy/kubernetes/` directory with Helm chart. No changes to application code; requires proper health check endpoints (already exist).

**Dependencies**: None (health checks already implemented)

**Estimated complexity**: 5d

**Implementation phases**:
1. Create Helm chart structure with values.yaml (1d)
2. Define Deployment manifests for all services (1d)
3. Add ConfigMap, Secret, and PVC templates (1d)
4. Add HorizontalPodAutoscaler and PodDisruptionBudget (1d)
5. Documentation and validation (1d)

### F-007: Enterprise Authentication (OAuth2/OIDC/SAML)

**User value**: Enterprise users authenticate via their existing identity provider (Azure AD, Okta, Google Workspace). SSO for both AIOS API and MITRA frontend.

**Architectural impact**: Add `auth/` module with OAuth2/OIDC/SAML provider support. Enhance existing JWT auth to support federated tokens. Add session management.

**Dependencies**: T-005 (auth disabled by default), T-006 (CORS wide open)

**Estimated complexity**: 8d

**Implementation phases**:
1. Design authentication architecture with provider abstraction (2d)
2. Implement OAuth2/OIDC provider (Azure AD primary) (3d)
3. Implement SAML provider (1d)
4. Add federated token validation and session management (1d)
5. Integration tests with test IdP (1d)

### F-008: Policy Engine

**User value**: Administrators define governance rules that constrain agent behaviour: allowed tools, approved LLM models, data access boundaries, rate limits, and audit requirements.

**Architectural impact**: New `src/aios/policy/` module with rule engine, evaluation context, and enforcement hooks. Integrates with `SecurityManager` and `PluginManager`.

**Dependencies**: F-001 (config schema for policies)

**Estimated complexity**: 8d

**Implementation phases**:
1. Design policy rule language and data model (2d)
2. Implement rule evaluation engine (2d)
3. Add enforcement hooks at agent execution, tool invocation, LLM call boundaries (2d)
4. Add policy management API (1d)
5. Documentation and examples (1d)

### F-009: Plugin Marketplace Foundation

**User value**: Users discover, install, and manage community-contributed plugins from a registry. Ecosystem growth enabled.

**Architectural impact**: New `src/aios/plugins/marketplace.py` module with registry client (GitHub-based or simple index). Extends `PluginManager` with remote install support.

**Dependencies**: Existing `PluginManager`, `PluginLoader`

**Estimated complexity**: 5d

**Implementation phases**:
1. Design plugin registry schema and index format (1d)
2. Implement registry client (list, search, resolve) (2d)
3. Extend `PluginManager.install()` for remote sources (1d)
4. Add `aios plugins search` and `aios plugins publish` CLI commands (1d)

---

## Phase 3 — Release Engineering Plan

### Branching Strategy: GitHub Flow (Trunk-Based)

```
main ───●────●────●────●────●────●────── (production releases)
          \  / \  / \  / \  / \  /
feature    ●─●   ●─●   ●─●   ●─●
```

- `main` is always deployable; protected branch with required PR checks
- Feature branches branch from `main`, merge back via PR
- Release tags: `v1.2.0`, `v1.2.1`, etc.
- Hotfix branches: `fix/description` from `main`, merge back with expedited review

### Versioning Strategy: Semantic Versioning 2.0.0

| Component | Version Field | Trigger |
|-----------|--------------|---------|
| **MAJOR** | `1.x.x` → `2.x.x` | Breaking API changes, breaking data format changes |
| **MINOR** | `x.2.x` → `x.3.x` | New features, backward-compatible enhancements |
| **PATCH** | `x.x.0` → `x.x.1` | Bug fixes, security patches, documentation |

The `aios` Python package, `mitra-backend`, and `mitra-frontend` are versioned independently but released together with a unified release tag (e.g., `v1.2.0`).

### CI/CD Improvements

| Priority | Improvement | Current State | Target State | Effort |
|----------|-------------|---------------|--------------|--------|
| P0 | Backend CI pipeline | None | ruff → mypy → jest → build Docker image | 2d |
| P0 | Frontend CI pipeline | None | tsc → vite build → (future: vitest tests) | 2d |
| P1 | Backend CD pipeline | None | Build → push to container registry on tag | 1d |
| P1 | Frontend CD pipeline | None | Build → push to container registry on tag | 1d |
| P1 | AIOS publishing improvements | PyPI on tag only | Add test.pypi publishing pre-release | 1d |
| P2 | Dependency scanning | None | Add Dependabot or Renovate config | 1d |
| P2 | Code quality gate | None | Add SonarCloud or CodeCov integration | 1d |
| P2 | Security scanning | None | Add `pip-audit` or Snyk to CI | 1d |

### Release Cadence

| Release Type | Frequency | Process | Hotfix Path |
|-------------|-----------|---------|-------------|
| **Major** | Quarterly | Full regression + acceptance suite | N/A |
| **Minor** | Monthly | CI passes + changelog + tag | N/A |
| **Patch** | Bi-weekly (ad-hoc) | Targeted fix + CI + expedited review | Branch from `main`, fast-track PR |
| **Security** | As needed (48h SLA) | Immediate fix + CI + emergency review | Same as patch with expedited approval |

### Security Patch Process

1. Security issue reported or discovered → file confidential issue
2. Triage within 4 hours → severity assessment
3. Fix branch created from `main`
4. Fix reviewed by two maintainers
5. CI must pass (lint + typecheck + test + build)
6. Merge to `main`, tag `v{major}.{minor}.{patch+1}`
7. Release notes include CVE reference
8. For critical CVEs: backport to latest LTS release

### Dependency Update Policy

| Dependency Type | Update Cadence | Review Requirement | Automation |
|----------------|---------------|-------------------|------------|
| Runtime (pip/npm) | Monthly minor, weekly patch | PR review + CI must pass | Dependabot weekly |
| Dev tooling | Quarterly | PR review | Dependabot monthly |
| Container base images | Monthly | Security scan must pass | Dependabot + CI |
| Pin breaking changes | Use `>=x,<y` ranges | Architect review | Manual |

### Long-Term Support Policy

- LTS releases: every 4th minor version (e.g., v1.0, v1.4, v1.8)
- LTS support window: 12 months from release date
- During support window: security patches + critical bug fixes
- After support window: migrate to next LTS
- Current LTS: v1.1 (until 2027-Q3)

---

## Phase 4 — Documentation Roadmap

### Current Documentation Assessment

| Document | Status | Quality | Gaps |
|----------|--------|---------|------|
| **README** | EXISTS | Adequate | Describes Python AIOS only; no mention of full stack |
| **Architecture Guide** | EXISTS | Good (docs/Architecture.md, SYSTEM_ARCHITECTURE.md, architecture/*) | Two separate documents; no unified architecture view across AIOS + MITRA |
| **API Reference** | EXISTS | Good (docs/API.md, 601 lines) | Covers AIOS only; MITRA backend API not documented in this repo |
| **CLI Reference** | EXISTS | Good (docs/CLI.md, 463 lines) | Comprehensive |
| **Developer Guide** | EXISTS | Adequate (docs/DeveloperGuide.md, 363 lines) | AIOS-focused; no developer setup for backend/frontend |
| **User Guide** | EXISTS | Adequate (docs/UserGuide.md, 314 lines) | Basic; lacks advanced usage scenarios |
| **Deployment Guide** | EXISTS | Good (docs/Deployment.md, DEPLOYMENT.md, RELEASE/) | Docker-focused; no Kubernetes guide yet |
| **Security Guide** | EXISTS | Adequate (docs/Security.md, 266 lines) | Covers AIOS auth; missing network security, secrets management guide |
| **Troubleshooting** | EXISTS | Adequate (docs/Troubleshooting.md) | Basic; needs common scenarios |
| **Contribution Guide** | MISSING | — | No CONTRIBUTING.md; no PR/issue templates; no code of conduct |
| **Operations Handbook** | MISSING | — | No runbook for production operations; no backup/restore procedure doc |
| **Tutorials** | MISSING | — | No getting-started tutorial beyond README quick start |
| **Examples** | MISSING | — | No example applications or integration patterns |

### Prioritised Documentation Backlog

#### P0 — Ship with v1.2.0 GA

| Doc | Description | Effort | Rationale |
|-----|-------------|--------|-----------|
| Contribution Guide (`CONTRIBUTING.md`) | PR workflow, code style, commit conventions, review process, CLA | 2d | Required for community contributions |
| Issue and PR templates | Bug report, feature request, PR description templates | 1d | Standardise contribution quality |
| Code of Conduct | Contributor covenant or equivalent | 0.5d | Community governance |
| CHANGELOG consolidation | Single unified changelog; deduplicate `CHANGELOG.md` and `CHANGELOG_v3.2.md` | 1d | Traceability |
| Git history initialisation | Initial commit with repository baseline; establish tagging convention | 0.5d | Release traceability |

#### P1 — Ship with v1.2.0-rc

| Doc | Description | Effort | Rationale |
|-----|-------------|--------|-----------|
| Operations Handbook (`docs/operations-handbook.md`) | Health check interpretation, log locations, backup/restore, scaling, incident response | 3d | Required for production operators |
| Deployment Guide — Kubernetes (`docs/deployment-k8s.md`) | Helm chart usage, K8s prerequisites, configuration, troubleshooting | 2d | Supports F-006 |
| Monitoring Guide (`docs/monitoring.md`) | Metrics reference, dashboard setup, alerting rules, log aggregation | 2d | Supports F-005 |
| Architecture Guide — Unified (`docs/architecture-unified.md`) | Combined AIOS + MITRA architecture; component interactions, data flow | 2d | Developer onboarding |

#### P2 — Ship with v1.2.x maintenance or v1.3

| Doc | Description | Effort | Rationale |
|-----|-------------|--------|-----------|
| Tutorial — First Agent (`docs/tutorials/first-agent.md`) | Step-by-step guide to creating and running an agent | 2d | Developer adoption |
| Tutorial — Custom Plugin (`docs/tutorials/custom-plugin.md`) | Guide to writing, packaging, and installing a plugin | 2d | Ecosystem growth |
| Example Applications | Reference implementations for common patterns (chatbot, RAG system, workflow automation) | 5d | Accelerate adoption |
| API Reference — MITRA Backend | Auto-generated OpenAPI/Swagger docs for the NestJS API | 2d | Backend integration |
| Migration Guide (`docs/migration-v1.1-to-v1.2.md`) | Breaking changes, deprecations, upgrade steps | 1d | Upgrade path |

---

## Recommended Milestones

| Milestone | Date (Target) | Deliverables | Dependencies |
|-----------|--------------|--------------|--------------|
| **M1: Foundation Sprint** | Week 1-2 | T-001 through T-006 (critical debt), CHANGELOG consolidation, Git history init, CONTRIBUTING.md | None |
| **M2: Backend+Frontend CI** | Week 3 | T-008 (CI/CD), T-010 (frontend test infra), T-011 (Redis cache), T-019 (pre-commit hooks) | M1 |
| **M3: Architecture Unification** | Week 4-5 | F-001 (unified config), F-002 (unified events), T-009 (large module refactors) | M1 |
| **M4: Agent Productionisation** | Week 5-6 | T-007 (mock implementations → real), T-020 (orchestrator shutdown), T-014 (type ignore cleanup) | M3 |
| **M5: Observability v1** | Week 6-7 | F-005 (observability dashboard), T-016 (structured logging), T-017 (monitoring stack) | M1 |
| **M6: Authentication** | Week 7-8 | F-007 (OAuth2/OIDC/SAML), T-005 (auth default-on), T-006 (CORS lockdown) | M1 |
| **M7: Distributed Execution** | Week 8-10 | F-003 (distributed execution engine), F-004 (advanced model routing) | M3, M4 |
| **M8: Kubernetes + Deployment** | Week 10-11 | F-006 (K8s support), P1 documentation (operations handbook, monitoring guide, unified architecture) | M5 |
| **M9: Policy + Marketplace** | Week 11-12 | F-008 (policy engine), F-009 (plugin marketplace foundation) | M1, M3 |
| **M10: RC & Release** | Week 12-13 | All P2-P3 debt, P2 documentation, end-to-end testing, release artefact validation | All prior milestones |

### Release Timeline

```
v1.2.0-alpha  (Week 4)   — M1 + M2 complete
v1.2.0-beta   (Week 8)   — M1 through M6 complete
v1.2.0-rc     (Week 11)  — M1 through M9 complete; full regression pass
v1.2.0 GA     (Week 13)  — M10 complete; release published to PyPI + container registries
v1.2.1        (Week 16)  — First patch release
v1.2.2        (Week 20)  — Second patch release
v1.3.0        (Week 26)  — Next feature release (Q4 2026)
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-01: Dual-system merge conflicts during architecture unification | Medium | High | Feature flags for each retired subsystem; parallel run before removal; comprehensive test suite |
| R-02: Distributed execution introduces latent concurrency bugs | Medium | High | Thread sanitizer in CI; stress testing at 10x expected concurrency; phased rollout (subprocess → local network → remote) |
| R-03: OAuth2/OIDC integration breaks existing JWT auth flow | Low | Critical | Integration test suite against test IdP; backward-compatible token validation; canary deployment |
| R-04: Frontend observability dashboard duplicates existing MITRA dashboard | Medium | Low | Dashboard is a separate route `/ops/monitoring`; shares component library but is independently maintained |
| R-05: Plugin marketplace creates supply chain risk | Medium | High | Plugin signing (signature verification); sandboxed execution for third-party plugins; manual review for marketplace listing |
| R-06: Contributors submit low-quality PRs without contribution guide | Medium | Low | Publish CONTRIBUTING.md early (M1); add PR template with checklist; CI gates (lint, typecheck, test) |
| R-07: v1.1.0 production deployment develops issues during v1.2 development | Low | Critical | Maintain v1.1.x LTS branch for security patches; hotfix process documented; v1.2 changes are additive until GA |
| R-08: Team capacity insufficient for 13-week milestone plan | Medium | High | Prioritise P0-P1 debt and F-001/F-002/F-005/F-007 as mandatory; defer F-003/F-008/F-009 to v1.3 if under-resourced |

---

## Appendices

### A. Architecture Consolidation Map (Current → Target)

```
Current State:                        Target State (v1.2+):
─────────────────                     ──────────────────
src/aios/
  core/config.py        ──retire──▶   config/manager.py (unified)
  events/bus.py         ──retire──▶   eos/event_bus.py (unified)
  memory/engine.py      ──retire──▶   memory/memory_manager.py (unified)
  agent/planner.py      ──rewrite──▶  agent/planner.py (real implementation)
  agent/executor.py     ──rewrite──▶  agent/executor.py (real implementation)
  agent/reflection.py   ──rewrite──▶  agent/reflection.py (real implementation)
  api/auth.py           ──enhance──▶  security/auth.py (OAuth2/OIDC/SAML, enabled by default)
  api/app.py            ──fix──▶     api/app.py (restrictive CORS)
  api/routes.py         ──refactor──▶ api/routes_v2/ (split by domain)
  eos/runtime_engine.py ──refactor──▶ eos/engine/runtime.py (smaller modules)
  eos/workflow_engine.py──refactor──▶ eos/engine/workflow.py (smaller modules)

New modules:
  aios/distributed/     ──new──▶     distributed execution engine
  aios/policy/          ──new──▶     policy engine
  aios/plugins/marketplace/──new──▶  plugin marketplace client
  deploy/kubernetes/    ──new──▶     Helm charts
```

### B. Dependency Graph Between Milestones

```
M1 (Foundation) ──────────────────────────────────────────────┐
  ├── M2 (CI/CD)                                               │
  ├── M3 (Architecture Unification) ─── M4 (Agent Prod) ──────┤
  ├── M5 (Observability)                                       │
  └── M6 (Authentication)                                      │
                                                               ▼
                         M7 (Distributed Execution) ──── M9 (Policy + Marketplace)
                                           │
                                           ▼
                              M8 (Kubernetes + Deploy Docs)
                                           │
                                           ▼
                                   M10 (RC & Release)
```

### C. Effort Summary by Phase

| Phase | Items | Total Effort (Engineering-Days) |
|-------|-------|--------------------------------|
| Technical Debt (P0) | 6 | 16 |
| Technical Debt (P1) | 8 | 27 |
| Technical Debt (P2) | 7 | 13.5 |
| Technical Debt (P3) | 5 | 12.5 |
| Features (F-001–F-009) | 9 | 57 |
| Documentation (P0–P2) | 12 | 22.5 |
| CI/CD Improvements | 8 | 10 |
| **Total** | **55** | **158.5** |

**Full-time team of 3 engineers**: ~10.5 weeks  
**Full-time team of 4 engineers**: ~8 weeks  

---

**End of MITRA AIOS v1.2 Roadmap**
