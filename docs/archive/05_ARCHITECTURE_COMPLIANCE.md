# Architecture Compliance Report

> Evaluates implementation against architectural specifications.
> Score: 0–100 per category.

---

## 1. Database Architecture (Score: 40/100)

### Schema-per-Domain Pattern
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Schema-per-domain | ⚠️ Partial | TypeORM `synchronize` mode creates tables in `public` schema by default. No explicit `{ schema: 'commercial' }` decorators confirmed across all entities. Migration files suggest some schema usage. |
| UUID primary keys | ✅ | All entities use UUID primary keys |
| Project ID on every row | ❌ | Not enforced — many entities lack `project_id` field |
| Schema: commercial | ⚠️ Partial | Enquiry/quotation tables exist. Missing: customers, contacts |
| Schema: project | ⚠️ Partial | Projects/milestones exist. Missing: tasks, teams, team_members |
| Schema: engineering | ✅ | Designs, revisions, BOMs, process plans, ECR/ECO all present |
| Schema: manufacturing | ✅ | Work orders, machines, production batches, operations present |
| Schema: quality | ❌ Missing | Missing: inspection_plans, inspection_results, ncrs tables |
| Schema: service | ❌ Missing | Missing: dispatch_records, installations, maintenance_logs, warranties |
| Schema: knowledge | ✅ | Knowledge articles, categories, tags, embeddings present |
| Schema: security | ⚠️ Partial | Users, roles, permissions exist. Missing: dedicated `security` schema |
| Schema: audit | ✅ | Audit log table with full schema |
| Schema: analytics | ❌ Missing | No analytics schema or materialized views |

### Indexing
| Requirement | Status | Evidence |
|-------------|--------|----------|
| project_id indexes | ❌ | Not consistently applied |
| Foreign key indexes | ⚠️ | Some TypeORM auto-indexes, not all |
| Vector index for embeddings | ✅ | `knowledge_embeddings` table with pgvector |

### Migration Strategy
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Migration tool (TypeORM) | ✅ | 8 migration files in `src/database/migrations/` |
| Per-schema migrations | ❌ | All migrations in single directory, no schema separation |
| Rollback support | ⚠️ | Migrations extend `Migration` but rollbacks not evident in all |
| `synchronize: false` in production | ✅ | Enforced in TypeORM config |

**Deductions:**
- -15 Missing schemas (quality/service/analytics)
- -10 No `project_id` enforcement
- -10 `synchronize` enabled in dev mode (data loss risk)
- -10 Missing migration rollback patterns
- -5 Missing per-schema migration directories
- -5 No dedicated schema decorators on entities
- -5 Inconsistent indexing

---

## 2. API Standards (Score: 45/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RESTful naming | ⚠️ Partial | `/commercial/enquiries` should be `/commercial/rfqs`. Controller names don't match spec. |
| HTTP method usage | ⚠️ Partial | DELETE endpoints return 200 (not 204). POST for delete operations. |
| Standard response envelope | ❌ | Controllers return raw data or service responses, not wrapped in `{ data, meta }` |
| Error model consistency | ⚠️ | NestJS exception filters handle errors, but not uniform across all domains |
| Pagination on list endpoints | ⚠️ | PaginationDto exists, used by most but not all (dispatch has no pagination) |
| Filtering operators | ❌ | No `.gte`, `.in`, `.like` filter support implemented |
| Sorting API | ❌ | No sort parameter processing |
| API versioning (/api/v1) | ❌ | Routes start with domain name, not `/api/v1/` prefix |
| Idempotency keys | ❌ | Not implemented |
| Swagger/OpenAPI | ⚠️ | Most controllers lack `@ApiOperation`, `@ApiResponse` decorators |
| DTO validation | ✅ | class-validator decorators on DTOs |
| Standard error codes | ⚠️ | Exception filters exist but not all 7 spec error codes implemented |

**Deductions:**
- -15 Missing common response envelope
- -10 No `/api/v1/` URL prefix
- -10 No filtering/sorting operators
- -5 Inconsistent HTTP status codes
- -5 Missing Swagger annotations on most controllers
- -5 Missing pagination on some list endpoints
- -5 No idempotency support

---

## 3. Workflow Engine (Score: 60/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| State machine pattern | ✅ | WorkflowService with State/Transition/Instance entities |
| Mold project lifecycle (16 stages) | ✅ | MOLD_ALLOWED_TRANSITIONS enum covers spec |
| Domain integration | ❌ | Only project module integrates with workflow engine |
| Transition validation | ✅ | validateMoldTransition enforces linear progression |
| Role/Permission guards on transitions | ✅ | Required role and permission checks |
| Approval gate support | ✅ | requiresApproval flag on transitions |
| State machine per domain | ❌ | No RFQ, Quotation, Design, BOM, WorkOrder, NCR, CAPA, ServiceRequest state machines |
| Transition history | ✅ | WorkflowInstance.history array |
| State transition log table | ❌ | No `state_transitions` table per spec — history stored in JSONB field of instance |

**Deductions:**
- -20 No per-domain state machines (only project)
- -10 No dedicated state_transitions table
- -5 No event publishing on transitions
- -5 No frontend workflow visualization

---

## 4. Security Architecture (Score: 55/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| JWT authentication | ✅ | JwtAuthGuard, JwtStrategy, login/refresh endpoints |
| Password hashing (bcrypt) | ✅ | AuthService uses bcrypt |
| Token expiry (15 min access + 7 day refresh) | ✅ | JWT config with expiresIn |
| RBAC | ✅ | RolesGuard, PermissionsGuard registered globally |
| Permission matrix | ⚠️ | Permissions exist in DB but not seeded per PERMISSION_MODEL.md matrix |
| Audit logging | ✅ | AuditInterceptor + audit_log entity |
| TLS/HTTPS | ⚠️ | Nginx config with TLS 1.3, but dev mode uses HTTP |
| Field-level encryption | ❌ | Not implemented |
| Secrets management | ❌ | .env files used; no Vault, no Docker secrets |
| File upload security | ❌ | No presigned URLs, no file validation middleware |
| Rate limiting | ⚠️ | ThrottlerGuard registered (100 req/min) |
| Password policy | ⚠️ | No minimum length or complexity enforcement visible |
| CORS | ⚠️ | Vite proxy used in dev; CORS config not confirmed in backend |

**Deductions:**
- -15 No field-level encryption
- -10 No secrets management infrastructure
- -10 No file upload security
- -5 Password policy not enforced
- -5 Missing permission seed data

---

## 5. Permission Model (Score: 40/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RBAC roles defined | ⚠️ | Roles exist but named differently: ADMIN, MANAGEMENT, SALES, DESIGN, PLANNING, PRODUCTION, QUALITY, CUSTOMER, SERVICE vs spec: admin, manager, sales_rep, engineer, production_planner, operator, qa_inspector, qa_engineer, service_tech, viewer |
| Permission matrix seeded | ❌ | No seed data matching PERMISSION_MODEL.md matrix |
| Permission entity (resource + action) | ✅ | Permission entity with resource/action columns |
| Role-Permission association | ✅ | RolePermission junction table |
| Project-scoped roles | ❌ | No project scope enforcement in permission evaluation |
| Frontend permission hooks | ❌ | Frontend doesn't consume permissions for conditional rendering |
| Global guards | ✅ | JwtAuthGuard, RolesGuard, PermissionsGuard registered globally |
| Audit of permission changes | ❌ | No specific audit for role/permission changes |

**Deductions:**
- -20 Role names don't match spec
- -10 Permission matrix not seeded
- -10 No project-scoped permissions
- -10 No frontend permission integration
- -5 No permission change audit
- -5 Inconsistent role enforcement (some GET endpoints unguarded)

---

## 6. Knowledge Graph (Score: 5/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| graph_nodes table | ❌ | Not created |
| graph_edges table | ❌ | Not created |
| Node types (34 types) | ❌ | Not implemented |
| Edge types (22 types) | ❌ | Not implemented |
| Event-driven construction | ❌ | No events → no graph building |
| Impact analysis queries | ❌ | Not implemented |
| Root cause trace queries | ❌ | Not implemented |
| Similarity search (via embeddings) | ✅ | VectorSearchService exists, but queries knowledge_embeddings not graph |
| Graph visualization | ❌ | No frontend graph component |

**Deductions:**
- -30 No graph database tables
- -20 No graph construction mechanism
- -15 No impact analysis APIs
- -15 No root cause trace APIs
- -10 No visualization
- -5 Vector search exists but not connected to graph

---

## 7. Event Catalog (Score: 0/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Event bus | ❌ | Not implemented. CacheModule (with Redis) commented out. |
| Domain events (all 40+) | ❌ | Zero events published from any domain |
| Event dispatcher service | ❌ | No EventDispatcher class |
| Event subscribers | ❌ | No subscription infrastructure |
| Producer-consumer matrix | ❌ | Not operational |
| Event versioning | ❌ | Not implemented |
| Dead-letter queue | ❌ | Not implemented |
| Event-driven workflows | ❌ | Quote-to-project, design-to-manufacturing flows don't exist as event chains |

**Deductions:**
- -40 No event bus infrastructure
- -20 No domain events
- -20 No event-driven workflow
- -10 No event versioning
- -10 No dead-letter handling

---

## 8. AI Strategy (Score: 70/100)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Local AI (Ollama) | ✅ | OllamaProvider, configured in docker-compose |
| Vector store | ✅ | pgvector, knowledge_embeddings table, EmbeddingService |
| Knowledge base | ✅ | KnowledgeArticle entity, categories, tags, search |
| AI Copilot service | ✅ | AiService, AiContextService, conversation/message entities |
| Explainable AI | ⚠️ | AiContextService retrieves context, but explanation generation not confirmed |
| Human approval for engineering changes | ❌ | No AI→human approval workflow implemented |
| Knowledge growth from projects | ❌ | No automated knowledge extraction from completed projects |
| AI usage tracking | ✅ | AiUsageModule, AiUsageRecord entity |
| Graceful degradation | ✅ | AI features are optional — platform functions without AI |

**Deductions:**
- -10 No human approval workflow
- -10 No automated knowledge extraction
- -5 Knowledge graph not connected to AI
- -5 Explanation generation not verified

---

## Compliance Summary

| Category | Score | Assessment |
|----------|-------|------------|
| Database Architecture | 40/100 | Foundation exists, missing critical schemas |
| API Standards | 45/100 | Inconsistent naming and response patterns |
| Workflow Engine | 60/100 | Core engine solid, domain integration missing |
| Security Architecture | 55/100 | Auth/RBAC/Audit present, encryption missing |
| Permission Model | 40/100 | Roles misaligned, matrix not seeded |
| Knowledge Graph | 5/100 | Not implemented — biggest gap |
| Event Catalog | 0/100 | Not implemented — critical gap |
| AI Strategy | 70/100 | Strong foundation, workflow integration missing |
| **Overall** | **39/100** | |

### Compliance Trend

| Category | Baseline (Spec) | Current (Implementation) | Gap |
|----------|----------------|------------------------|-----|
| Event Catalog | 100% | 0% | -100% |
| Knowledge Graph | 100% | 5% | -95% |
| Permission Model | 100% | 40% | -60% |
| API Standards | 100% | 45% | -55% |
| Database Architecture | 100% | 40% | -60% |
| Workflow Engine | 100% | 60% | -40% |
| Security Architecture | 100% | 55% | -45% |
| AI Strategy | 100% | 70% | -30% |
