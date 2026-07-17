# MITRA v3.2 — Comprehensive Security & Architecture Audit Report

**Audit Date:** 2026-06-20
**Scope:** 286 backend source files, 4 migrations, 67 entities, 30+ controllers, 25+ services, infrastructure, CI/CD, and deployment configuration
**Auditors:** Multi-agent deep audit swarm (Security, Database, Services, Infrastructure)
**Methodology:** Static code analysis, entity↔migration cross-reference, dependency CVE check, container security review, authorization pattern analysis

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 19 | Tenant isolation bypasses, mass assignment vulnerabilities, missing DB tables, schema drift, production data loss risks, unauthenticated Redis, CVEs |
| **HIGH** | 30 | Missing authorization checks, DoS vectors, missing pagination, infrastructure hardening gaps, CI/CD security issues, type mismatches |
| **MEDIUM** | 20 | DTO inconsistencies, missing indexes, missing optimistic locking, metadata gaps, PostgreSQL tuning |
| **LOW** | 16 | Code style, documentation, governance files, cosmetic issues |
| **TOTAL** | **85** | |

**Production Readiness Score: 58/100** (Not production-ready without P0 remediation)

---

## Remediation Priority Matrix

| Priority | Timeline | Findings | Effort |
|----------|----------|----------|--------|
| **P0 — Immediate** | Before production | All CRITICAL | 3–5 days |
| **P1 — This Sprint** | Within 2 weeks | HIGH | 1–2 weeks |
| **P2 — Next Sprint** | Within 4 weeks | MEDIUM | 2–3 weeks |
| **P3 — Backlog** | Ongoing | LOW | Ongoing |

---

# CRITICAL FINDINGS (19)

---

## CRIT-1: Mass Assignment via Unvalidated TypeScript Interfaces (UserController)
**File:** `src/modules/platform/controllers/user.controller.ts` (lines 36–51, 53–62)
**File:** `src/modules/platform/services/user.service.ts` (lines 8–27, 102–115)
**Impact:** Privilege escalation, arbitrary password reset, tenant escape

`CreateUserDto` and `UpdateUserDto` are **TypeScript interfaces**, not `class-validator` classes. At runtime the global `ValidationPipe` sees `Object` and cannot validate or whitelist anything. An attacker can send arbitrary fields such as `roleId`, `status`, `password`, or `tenantId`.

**Current Code:**
```typescript
// user.controller.ts
import { UserService, CreateUserDto, UpdateUserDto } from '../services/user.service';

@Post()
async create(@Body() body: CreateUserDto, ...) {
  return this.userService.create({ ...body, tenantId: user.tenantId ?? undefined }, user.id);
}

@Patch(':id')
async update(@Body() body: UpdateUserDto, ...) {
  return this.userService.update(id, body, user.id, user.tenantId);
}
```

**Fix:** Replace with concrete DTO classes.

```typescript
// src/modules/platform/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
  @ApiProperty() @IsString() @MinLength(2) firstName: string;
  @ApiProperty() @IsString() @MinLength(2) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

// src/modules/platform/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
```

Update controller imports:
```typescript
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
```

---

## CRIT-2: Cross-Tenant Project Transition
**File:** `src/modules/project/services/project.service.ts` (line 129–152)
**Impact:** Any authenticated user can transition any project across tenants

`transitionStage()` calls `await this.findOne(id)` **without passing `tenantId`**.

**Current Code:**
```typescript
async transitionStage(id: string, toStage: string, userId: string, remarks?: string) {
  const project = await this.findOne(id);   // tenantId omitted
  ...
}
```

**Fix:**
```typescript
async transitionStage(
  id: string, toStage: string, userId: string,
  tenantId?: string | null, remarks?: string,
) {
  const project = await this.findOne(id, tenantId);
  ...
}
```

Update controller:
```typescript
@Post(':id/transition')
async transition(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: TransitionStageDto,
  @CurrentUser() user: AuthUser,
) {
  return this.service.transitionStage(id, dto.toStage, user.id, user.tenantId ?? undefined, dto.remarks);
}
```

---

## CRIT-3: Cross-Tenant Project Health Computation
**File:** `src/modules/project/services/project.service.ts` (lines 156–221)
**Impact:** Any authenticated user can read health data for any project

Same pattern as CRIT-2 — `computeHealth()` calls `findOne(id)` without `tenantId`.

**Fix:**
```typescript
async computeHealth(id: string, tenantId?: string | null): Promise<HealthCheckResult> {
  const project = await this.findOne(id, tenantId);
  ...
}
```

---

## CRIT-4: Mass Assignment in Tenant Management
**File:** `src/modules/platform/controllers/tenant.controller.ts` (lines 37–43, 45–52)
**File:** `src/modules/platform/services/tenant.service.ts` (lines 37–48)
**Impact:** Any field on the Tenant entity can be injected including internal fields

`TenantController` accepts `Record<string, unknown>` for create and update. No validation or whitelisting.

**Current Code:**
```typescript
@Post()
async create(@Body() body: Record<string, unknown>, ...) {
  return this.tenantService.create(body, user.id);
}

@Patch(':id')
async update(@Body() body: Record<string, unknown>, ...) {
  return this.tenantService.update(id, body, user.id);
}
```

**Fix:** Define strict DTOs.

```typescript
// src/modules/platform/dto/create-tenant.dto.ts
import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
```

Update controller:
```typescript
@Post()
async create(@Body() body: CreateTenantDto, ...) { ... }
@Patch(':id')
async update(@Body() body: UpdateTenantDto, ...) { ... }
```

---

## CRIT-5: Cross-Tenant Workflow Instance Access & Transition
**File:** `src/modules/workflow/services/workflow.service.ts` (lines 122–191, 193–199, 201–206)
**Impact:** Any authenticated user can transition or read workflow history for any entity in any tenant

**Current Code:**
```typescript
async executeTransition(instanceId: string, transitionId: string, context: WorkflowContext) {
  const instance = await this.instanceRepository.findOne({
    where: { id: instanceId, deletedAt: IsNull() },   // no tenantId
    relations: ['currentState'],
  });
  ...
}

async getInstanceHistory(instanceId: string) {
  const instance = await this.instanceRepository.findOne({
    where: { id: instanceId, deletedAt: IsNull() },   // no tenantId
  });
  ...
}

async findInstanceByEntity(entityType: string, entityId: string) {
  return this.instanceRepository.findOne({
    where: { entityType, entityId, deletedAt: IsNull() },   // no tenantId
  });
}
```

**Fix:** Enforce tenant isolation in all three methods.

```typescript
async executeTransition(instanceId: string, transitionId: string, context: WorkflowContext) {
  const where: any = { id: instanceId, deletedAt: IsNull() };
  if (context.tenantId) where.tenantId = context.tenantId;
  const instance = await this.instanceRepository.findOne({ where, relations: ['currentState'] });
  ...
}

async getInstanceHistory(instanceId: string, tenantId?: string) {
  const where: any = { id: instanceId, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  const instance = await this.instanceRepository.findOne({ where });
  ...
}

async findInstanceByEntity(entityType: string, entityId: string, tenantId?: string) {
  const where: any = { entityType, entityId, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  return this.instanceRepository.findOne({ where, relations: ['currentState'] });
}
```

---

## CRIT-6: Arbitrary Password Reset Without Old Password Verification
**File:** `src/modules/platform/services/user.service.ts` (lines 102–115)
**Impact:** ADMIN can reset any user's password to anything without knowing the old password

**Current Code:**
```typescript
async update(id: string, dto: UpdateUserDto, userId: string, tenantId?: string | null) {
  const user = await this.findOne(id, tenantId);
  if (dto.password) {
    user.passwordHash = await bcrypt.hash(dto.password, 12);   // no old-password check
  }
  ...
}
```

**Fix:** Remove `password` from `UpdateUserDto` (already fixed in CRIT-1). Enforce password changes only via `AuthController.changePassword`.

If admin password-reset is required, create a separate endpoint:
```typescript
@Post(':id/reset-password')
@UseGuards(RolesGuard)
@Roles('ADMIN')
async adminResetPassword(@Param('id') id: string) {
  const tempPassword = randomBytes(12).toString('base64url');
  await this.userService.setPassword(id, tempPassword);
  return { temporaryPassword: tempPassword }; // return once — force change on next login
}
```

---

## CRIT-7: TOCTOU Race Condition in TenantAwareService
**File:** `src/common/services/tenant-aware.service.ts` (lines 42–58)
**Impact:** Tenant isolation is checked AFTER fetching from DB, allowing data race window

The `findOne()` method fetches the entity first, then checks `tenantId`. Between fetch and check, data can change.

**Fix:** Include `tenantId` in the WHERE clause directly:
```typescript
async findOne(id: string, tenantId?: string | null): Promise<T> {
  const where: any = { id, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  const entity = await this.repository.findOne({ where });
  if (!entity) throw new NotFoundException(`${this.entityName} not found`);
  return entity;
}
```

---

## CRIT-8: Mass Assignment in TenantAwareService Base Class
**File:** `src/common/services/tenant-aware.service.ts` (lines 60–75, 80–95)
**Impact:** Base `create()` and `update()` spread entire DTO, allowing client to overwrite protected fields

**Current Code:**
```typescript
async create(dto: any, userId?: string, tenantId?: string) {
  const entity = this.repository.create({
    ...dto,
    ...(tenantId ? { tenantId } : {}),
    ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
  });
  return this.repository.save(entity);
}

async update(id: string, dto: any, userId?: string, tenantId?: string) {
  const entity = await this.findOne(id, tenantId);
  Object.assign(entity, dto, userId ? { updatedBy: userId } : {});
  return this.repository.save(entity);
}
```

**Fix:** Whitelist only allowed fields:
```typescript
async create(dto: any, userId?: string, tenantId?: string) {
  const allowed = this.extractAllowedFields(dto);
  const entity = this.repository.create({
    ...allowed,
    ...(tenantId ? { tenantId } : {}),
    ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
  });
  return this.repository.save(entity);
}

async update(id: string, dto: any, userId?: string, tenantId?: string) {
  const entity = await this.findOne(id, tenantId);
  const allowed = this.extractAllowedFields(dto);
  Object.assign(entity, allowed, userId ? { updatedBy: userId } : {});
  return this.repository.save(entity);
}

private extractAllowedFields(dto: any): any {
  // Override in subclasses to define allowed fields
  // Or use a whitelist approach:
  const allowedFields = (this.constructor as any).ALLOWED_FIELDS ?? [];
  const result: any = {};
  for (const key of allowedFields) {
    if (key in dto) result[key] = dto[key];
  }
  return result;
}
```

---

## CRIT-9: Missing Tenant Isolation in DrawingAnalysisService
**File:** `src/modules/drawing-analysis/services/drawing-analysis.service.ts` (lines 35–55)
**Impact:** Cross-tenant data leak for drawing analyses

`getAnalysis()` and `getProjectAnalyses()` have no tenant filtering or soft-delete checks.

**Fix:** Add `tenantId` parameter and filter:
```typescript
async getAnalysis(id: string, tenantId?: string) {
  const where: any = { id, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  return this.repository.findOne({ where });
}

async getProjectAnalyses(projectId: string, tenantId?: string) {
  const where: any = { projectId, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  return this.repository.find({ where });
}
```

---

## CRIT-10: Missing Tenant Isolation in BomAnalysisService
**File:** `src/modules/bom-analysis/services/bom-analysis.service.ts` (lines 35–55)
**Impact:** Cross-tenant data leak for BOM analyses

Same pattern as CRIT-9.

**Fix:** Same pattern — add `tenantId` parameter and filter in WHERE clause.

---

## CRIT-11: Missing Transaction Wrapping for Multi-Step Operations
**File:** Multiple services (ProjectService, BomAnalysisService, DocumentVersionService, etc.)
**Impact:** Database inconsistency if a step fails mid-operation

Operations like "create project + workflow", "create BOM analysis + items", "upload file + create DB record" are not atomic.

**Fix:** Use TypeORM query runners or `@Transactional()` decorator:

```typescript
// Example: ProjectService.createProject
async createProject(dto: CreateProjectDto, userId: string, tenantId?: string) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const project = queryRunner.manager.create(Project, { ...dto, tenantId });
    await queryRunner.manager.save(project);
    // Create workflow instance
    await this.workflowService.createInstance(project.id, queryRunner.manager);
    await queryRunner.commitTransaction();
    return project;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

## CRIT-12: Missing DB Tables (6 Entities Have No Migration)
**File:** `src/database/migrations/` (missing 1700000000004 migration)
**Impact:** `schema:validate` and `migration:run` on fresh DB will fail with "relation does not exist"

| Entity | Table | File |
|--------|-------|------|
| DrawingAnalysis | `drawing_analyses` | `modules/drawing-analysis/entities/drawing-analysis.entity.ts` |
| AiUsageRecord | `ai_usage_records` | `modules/ai-usage/entities/ai-usage-record.entity.ts` |
| MachineStatus | `machine_status` | `modules/machine-status/entities/machine-status.entity.ts` |
| MachineTelemetry | `machine_telemetry` | `modules/machine-status/entities/machine-telemetry.entity.ts` |
| BomAnalysis | `bom_analyses` | `modules/bom-analysis/entities/bom-analysis.entity.ts` |
| BomItem | `bom_items` | `modules/bom-analysis/entities/bom-item.entity.ts` |

**Fix:** Create migration `database/migrations/1700000000004-MissingTables.ts`.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MissingTables1700000000004 implements MigrationInterface {
  name = 'MissingTables1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drawing_analyses" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "project_id" UUID NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_type" VARCHAR(50) NOT NULL,
        "file_url" VARCHAR(512) NOT NULL,
        "part_complexity" VARCHAR(20),
        "suggested_machining_time" DECIMAL(8,2),
        "risk_areas" JSONB,
        "confidence" DECIMAL(5,2),
        "extracted_features" JSONB,
        CONSTRAINT "PK_drawing_analyses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_drawing_analyses_tnt_del" ON "drawing_analyses" ("tenant_id", "deleted_at")`);

    // Repeat for ai_usage_records, machine_status, machine_telemetry, bom_analyses, bom_items
    // ... (use same pattern with their respective columns)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "drawing_analyses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_usage_records" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_status" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_telemetry" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bom_analyses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bom_items" CASCADE`);
  }
}
```

---

## CRIT-13: Missing Column in Migration — `audit_logs.event_type`
**File:** `src/modules/audit/entities/audit-log.entity.ts` (line 30)
**File:** `src/database/migrations/1700000000000-InitialSchema.ts` (lines 237–258)
**Impact:** Entity declares `event_type` but migration doesn't create it — runtime error on insert

**Fix:** Add to migration:
```sql
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "event_type" VARCHAR(20) NOT NULL DEFAULT 'CRUD';
```

---

## CRIT-14: `simple-json` ↔ `jsonb` Type Mismatch (18 Columns)
**File:** Multiple entity files (see list below)
**Impact:** TypeORM may down-cast JSONB to text, schema validator produces false positives

| Entity | Column | File Line |
|--------|--------|-----------|
| activitylog | `changes`, `metadata` | `collaboration/entities/activitylog.entity.ts` 31, 34 |
| comment | `mentionedUsers` | `collaboration/entities/comment.entity.ts` 33 |
| customfield | `selectOptions` | `collaboration/entities/customfield.entity.ts` 36 |
| customfieldvalue | `jsonValue` | `collaboration/entities/customfieldvalue.entity.ts` 30 |
| note | `visibilityRoles`, `mentionedUsers` | `collaboration/entities/note.entity.ts` 29, 32 |
| knowledgearticle | `tags`, `relatedModules` | `knowledge/entities/knowledgearticle.entity.ts` 30, 33 |
| searchindex | `keywords`, `metadata` | `search/entities/searchindex.entity.ts` 20, 23 |
| servicereport | `partsReplaced` | `service/entities/servicereport.entity.ts` 25 |
| trialobservation | `defectsObserved` | `quality/entities/trialobservation.entity.ts` 58 |
| retrialresult | `issuesResolved`, `pendingIssues` | `quality/entities/retrialresult.entity.ts` 20, 23 |
| inspectionreport | `defectsFound` | `quality/entities/inspectionreport.entity.ts` 43 |
| customerapproval | `pendingActions` | `customer/entities/customerapproval.entity.ts` 50 |
| cpschecklist | `categories` | `cps/entities/cpschecklist.entity.ts` 30 |
| cpsrequirement | `appliesToMoldTypes` | `cps/entities/cpsrequirement.entity.ts` 31 |
| processstep | `qualityCheckpoints` | `planning/entities/processstep.entity.ts` 28 |
| documentversion | `accessRoles`, `tags` | `document/entities/documentversion.entity.ts` 75, 78 |
| customerapprovalhistory | `metadata` | `customer/entities/customerapprovalhistory.entity.ts` 31 |

**Fix:** Replace `type: 'simple-json'` with `type: 'jsonb'` in every affected column.

```typescript
// BEFORE
@Column({ type: 'simple-json', nullable: true })
changes: Record<string, { from: any; to: any }> | null;

// AFTER
@Column({ type: 'jsonb', nullable: true })
changes: Record<string, { from: any; to: any }> | null;
```

Also fix `validate-schema.ts` line 63:
```typescript
'simple-json': 'jsonb',  // MITRA uses native JSONB for all JSON columns
```

---

## CRIT-15: `axios` Lockfile CVE Risk
**File:** `mitra-backend/package-lock.json` (axios block)
**Impact:** `axios` resolves to 1.17.0 which may contain known CVEs (SSRF via `Proxy-Authorization`)

**Fix:**
```bash
cd mitra-backend
rm package-lock.json
npm install axios@^1.7.9 --save
npm install --package-lock-only
```

---

## CRIT-16: `DB_SYNC` Environment-Driven Data Loss Risk
**File:** `src/app.module.ts` (line 59)
**Impact:** `DB_SYNC=true` in production can drop columns, recreate tables, cause catastrophic data loss

**Current Code:**
```typescript
synchronize: configService.get('DB_SYNC', 'false') === 'true',
```

**Fix:**
```typescript
synchronize: configService.get('NODE_ENV') === 'production'
  ? false
  : configService.get('DB_SYNC', 'false') === 'true',
```

Also add a startup validation in `main.ts`:
```typescript
if (isProd && process.env.DB_SYNC === 'true') {
  console.error('[MITRA] ❌ DB_SYNC=true is not allowed in production');
  process.exit(1);
}
```

---

## CRIT-17: Redis Runs Without Authentication
**File:** `mitra-backend/.env.example` (line 42)
**File:** `docker-compose.yml` (line 84)
**File:** `podman-compose.yml` (line 90)
**Impact:** Any compromised container can connect to Redis without credentials

**Current Config:**
```
REDIS_PASSWORD=
```
```yaml
command: redis-server --requirepass ${REDIS_PASSWORD:-}
```

**Fix:**
```
# .env.example line 42
REDIS_PASSWORD=REPLACE_WITH_REDIS_PASSWORD_min_32_chars
```

```yaml
# docker-compose.yml / podman-compose.yml
command: >
  redis-server
    --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
```

---

## CRIT-18: Missing Container Security Context
**File:** `docker-compose.yml` (lines 125–157)
**File:** `podman-compose.yml` (lines 130–161)
**Impact:** Backend container has writable root filesystem, full capabilities, can gain new privileges

**Fix:** Add to `backend` service in both compose files:
```yaml
backend:
  read_only: true
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
  tmpfs:
    - /tmp:noexec,nosuid,size=100m
  # Also add COPY --chown to Dockerfile (see HIGH-003)
```

---

## CRIT-19: Missing TLS / SSL Termination
**File:** `mitra-frontend/nginx.conf` (line 2)
**File:** `docker-compose.yml` (line 168)
**Impact:** All traffic is plaintext; `Strict-Transport-Security` sent over HTTP is an anti-pattern

**Fix:** Add HTTPS redirect and TLS listener:
```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

Mount TLS certificates via secrets or volume in compose.

---

# HIGH FINDINGS (30)

---

## HIGH-1: Missing Tenant Isolation in Drawing/BOM/Machine Controllers
**File:** `src/modules/drawing-analysis/controllers/drawing-analysis.controller.ts` (lines 35–55)
**File:** `src/modules/bom-analysis/controllers/bom-analysis.controller.ts` (lines 35–55)
**File:** `src/modules/machine-status/controllers/machine-status.controller.ts` (lines 35–62)
**Impact:** Cross-tenant data leak if services don't enforce isolation

**Fix:** Pass `tenantId` to all service calls:
```typescript
@Get(':id')
async getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
  return this.drawingAnalysisService.getAnalysis(id, user.tenantId ?? undefined);
}
```

---

## HIGH-2: Missing Tenant Isolation in AI Usage Controller
**File:** `src/modules/ai-usage/controllers/ai-usage.controller.ts` (lines 23–58)
**Impact:** Cross-tenant AI usage data leak

**Fix:** Pass `tenantId` to all service calls.

---

## HIGH-3: Missing Input Validation on Role Update
**File:** `src/modules/platform/controllers/role.controller.ts` (lines 51–60)
**Impact:** `Partial<CreateRoleDto>` bypasses validation — mass assignment

**Fix:**
```typescript
// src/modules/platform/dto/update-role.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
```

```typescript
@Patch(':id')
async update(@Body() body: UpdateRoleDto, ...) { ... }
```

---

## HIGH-4: Unbounded File Upload via Base64
**File:** `src/modules/drawing-analysis/dto/drawing-analysis.dto.ts` (lines 7–23)
**Impact:** DoS via multi-gigabyte base64 string

**Fix:**
```typescript
export class UploadDrawingDto {
  @ApiProperty({ description: 'Base64-encoded file content' })
  @IsString()
  @MaxLength(50_000_000)   // ~37 MB raw limit
  fileContentBase64: string;
}
```

Also add service-side validation:
```typescript
const decoded = Buffer.from(dto.fileContentBase64, 'base64');
if (decoded.length > 25 * 1024 * 1024) {
  throw new BadRequestException('File size exceeds 25 MB limit');
}
```

---

## HIGH-5: Failed Mutating Operations Not Audited
**File:** `src/common/interceptors/audit.interceptor.ts` (lines 33–87)
**Impact:** Failed logins, unauthorized mutations, validation errors never persisted

**Fix:** Use `catchError` to log failures:
```typescript
import { catchError } from 'rxjs/operators';

return next.handle().pipe(
  tap(async (response) => { await this.logEvent(context, request, response, null); }),
  catchError(async (err) => {
    await this.logEvent(context, request, null, err);
    throw err;
  }),
);
```

---

## HIGH-6: Missing Email Verification on Registration
**File:** `src/modules/platform/services/auth.service.ts` (lines 113–130)
**Impact:** Unverified email addresses can be used for registration

**Fix:**
```typescript
const user = this.userRepository.create({
  ...dto,
  status: 'pending',
  emailVerificationToken: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
  emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
});
```

---

## HIGH-7: No Rate Limiting on Refresh Token Endpoint
**File:** `src/modules/platform/controllers/auth.controller.ts` (lines 90–96)
**Impact:** Token brute-force possible

**Fix:**
```typescript
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(@Body() body: RefreshTokenDto) { ... }
```

---

## HIGH-8: Missing Tenant Isolation on Email Lookup
**File:** `src/modules/platform/services/user.service.ts` (lines 72–77)
**Impact:** `findByEmail()` returns first match across all tenants

**Fix:**
```typescript
async findByEmail(email: string, tenantId?: string | null) {
  const where: any = { email, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  return this.userRepository.findOne({ where, relations: ['role', 'role.permissions'] });
}
```

---

## HIGH-9: Missing Pagination on List Endpoints
**File:** Multiple controllers (Dispatch, MachineStatus, Workflow, BomAnalysis, DrawingAnalysis)
**Impact:** DoS via huge result sets

**Fix:** Add `PaginationDto` to all list endpoints:
```typescript
@Get()
findAll(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
  return this.svc.findAll(user.tenantId ?? 'default', q.page ?? 1, Math.min(q.limit ?? 20, 100));
}
```

---

## HIGH-10: Redis `KEYS` Command Used in Production
**File:** `src/modules/cache/redis.service.ts` (line 42)
**Impact:** `KEYS` blocks entire Redis server — O(n) on all keys

**Fix:** Replace with `SCAN`:
```typescript
async delByPattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const reply = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = reply[0];
    const keys = reply[1];
    if (keys.length) await this.client.del(...keys);
  } while (cursor !== '0');
}
```

---

## HIGH-11: PermissionsGuard Falls Back to `roles` When `permissions` Missing
**File:** `src/common/guards/permissions.guard.ts` (line 26)
**Impact:** Role named "ADMIN" would match a permission check

**Fix:** Remove the fallback. If `permissions` decorator is missing, the guard should pass (no permission required), not fall back to roles:
```typescript
const userPermissions: string[] = user?.permissions ?? [];
// Remove: ?? user?.roles ?? []
```

---

## HIGH-12: Missing `ParseUUIDPipe` on Controller Parameters
**File:** Multiple controllers (e.g., `project.controller.ts`, `designpart.controller.ts`)
**Impact:** Malformed IDs reach service layer causing SQL errors or injection

**Fix:** Add `ParseUUIDPipe` to all `:id` parameters:
```typescript
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
```

---

## HIGH-13: Missing `onDelete` on Foreign-Key Relations (5 Relations)
**File:** Multiple entity files
**Impact:** Deleting parent row throws FK violation instead of cascading/nullifying

| Entity | Relation | Parent | Suggested `onDelete` |
|--------|----------|--------|----------------------|
| `user.entity.ts` | `role` | `Role` | `SET NULL` |
| `workflow-instance.entity.ts` | `currentState` | `WorkflowState` | `SET NULL` |
| `workflow-transition.entity.ts` | `fromState` | `WorkflowState` | `CASCADE` |
| `workflow-transition.entity.ts` | `toState` | `WorkflowState` | `CASCADE` |
| `role-permission.entity.ts` | `role` / `permission` | `Role` / `Permission` | `CASCADE` |

**Fix:**
```typescript
@ManyToOne(() => Role, (role) => role.users, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'role_id' })
role: Role | null;
```

---

## HIGH-14: Missing Unique Constraints in Entities (6 Missing)
**File:** Multiple entity files
**Impact:** TypeORM unaware of DB constraints; `synchronize: true` won't recreate them

| Entity | Missing Unique | File |
|--------|----------------|------|
| `Tenant` | `code` | `tenant.entity.ts` line 9 |
| `User` | `email + tenantId` | `user.entity.ts` lines 9–10 |
| `Permission` | `resource + action` | `permission.entity.ts` lines 7–11 |
| `RolePermission` | `roleId + permissionId` | `role-permission.entity.ts` lines 8–22 |
| `Project` | `projectNumber + tenantId` | `project.entity.ts` line 45 |
| `WorkflowInstance` | `entityType + entityId` | `workflow-instance.entity.ts` lines 21–25 |

**Fix:** Add `@Unique()` decorators:
```typescript
@Unique(['code'])
@Entity('tenants')
export class Tenant extends IndustrialBaseEntity { ... }
```

---

## HIGH-15: Varchar Length Mismatches (7 Fields)
**File:** Multiple entity files vs migrations
**Impact:** Entity says one length, migration says another — schema drift

| Entity | Field | Entity Length | Migration Length |
|--------|-------|-------------|------------------|
| `tenant.entity.ts` | `name` | 100 | 255 |
| `role.entity.ts` | `name` | 50 | 100 |
| `permission.entity.ts` | `resource` | 50 | 100 |
| `workflow-instance.entity.ts` | `entityType` | 50 | 100 |
| `project.entity.ts` | `projectNumber` | 30 | 50 |
| `project.entity.ts` | `rfqNumber` | 50 | 100 |
| `project.entity.ts` | `poNumber` | 50 | 100 |

**Fix:** Align entity `length` to match migration (use migration values as source of truth, or vice versa, but be consistent):
```typescript
@Column({ type: 'varchar', length: 255 })
name: string;
```

---

## HIGH-16: Missing `.dockerignore` — Secret Leakage Risk
**File:** `mitra-backend/Dockerfile` (line 14), `mitra-frontend/Dockerfile` (line 9)
**Impact:** `COPY . .` copies `.git`, `.env`, IDE configs, secrets into image

**Fix:** Create `mitra-backend/.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
.env*
*.env
coverage
.vscode
.idea
dist
test
*.spec.ts
*.e2e-spec.ts
```

Also create `mitra-frontend/.dockerignore`.

---

## HIGH-17: `COPY --chown` Missing in Backend Dockerfile
**File:** `mitra-backend/Dockerfile` (lines 34–35)
**Impact:** Files owned by root, not `mitra` user

**Fix:**
```dockerfile
COPY --from=builder --chown=mitra:mitra /app/dist ./dist
COPY --from=builder --chown=mitra:mitra /app/src/database ./src/database
```

---

## HIGH-18: `tsconfig.json` Missing `strict: true`
**File:** `mitra-backend/tsconfig.json` (lines 2–37)
**Impact:** Missing null-reference, implicit-any, and unsafe assignment checks

**Fix:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "strictPropertyInitialization": false,
    ...
  }
}
```

---

## HIGH-19: `passWithNoTests` Masks Missing Test Coverage
**File:** `mitra-backend/package.json` (lines 12–14, 23)
**Impact:** CI passes even with zero tests

**Fix:** Remove `--passWithNoTests` from all test scripts:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage",
"test:e2e": "jest --config ./test/jest-e2e.json"
```

---

## HIGH-20: Missing `coverageThreshold` in Jest
**File:** `mitra-backend/package.json` (lines 84–109)
**Impact:** CI can pass with dangerously low code coverage

**Fix:**
```json
"coverageThreshold": {
  "global": {
    "branches": 70,
    "functions": 70,
    "lines": 75,
    "statements": 75
  }
}
```

---

## HIGH-21: No ESLint Configuration File
**File:** `mitra-backend/` (root)
**Impact:** ESLint runs with default rules only — missing security rules

**Fix:** Create `mitra-backend/eslint.config.mjs`:
```javascript
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': ts, security },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn',
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-fs-filename': 'error',
    },
  },
];
```

---

## HIGH-22: `sourceMap: true` Exposes Source Code in Production
**File:** `mitra-backend/tsconfig.json` (line 10)
**Impact:** `.js.map` files reconstruct original TypeScript source

**Fix:**
```json
"sourceMap": false
```
Or strip maps in Dockerfile:
```dockerfile
RUN find ./dist -name "*.map" -delete
```

---

## HIGH-23: `ci.yml` Lint Step Never Fails (`|| true`)
**File:** `.github/workflows/ci.yml` (line 37)
**Impact:** Lint gate is useless

**Fix:**
```yaml
- name: Lint
  run: npm run lint -- --max-warnings 0
```

---

## HIGH-24: `ci.yml` Frontend Uses `npm install` Instead of `npm ci`
**File:** `.github/workflows/ci.yml` (line 85)
**Impact:** Non-deterministic builds

**Fix:**
```yaml
run: npm ci --ignore-scripts
```

---

## HIGH-25: Missing Container Security Scan in CI
**File:** `.github/workflows/ci.yml`
**Impact:** No vulnerability scanning of built Docker images

**Fix:** Add Trivy scan after Docker build:
```yaml
- name: Scan backend image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: mitra-backend:ci
    format: sarif
    output: trivy-backend.sarif
```

---

## HIGH-26: `ci.yml` Smoke Test Doesn't Validate Health Endpoint
**File:** `.github/workflows/ci.yml` (lines 111–124)
**Impact:** Container that crashes after startup still "passes"

**Fix:**
```yaml
run: |
  docker run -d --name test-backend ...
  for i in {1..30}; do
    sleep 2
    docker exec test-backend wget -qO- http://localhost:3001/api/health && break
  done
  docker rm -f test-backend
```

---

## HIGH-27: `@types/minio` v7 Mismatched with `minio` v8 Runtime
**File:** `mitra-backend/package.json` (line 70)
**Impact:** Type definitions inaccurate for v8 APIs

**Fix:**
```bash
npm uninstall @types/minio
```
MinIO v8 ships its own TypeScript declarations.

---

## HIGH-28: `log_min_duration_statement=500` Too Low for Production
**File:** `docker-compose.yml` (line 74), `podman-compose.yml` (line 81)
**Impact:** Sensitive data may be logged; excessive log volume

**Fix:**
```yaml
-c log_min_duration_statement=5000
```

---

## HIGH-29: Missing `npm audit` in Frontend CI Job
**File:** `.github/workflows/ci.yml` (lines 68–94)
**Impact:** Frontend vulnerabilities not caught in CI

**Fix:** Add `npm audit` step to frontend job.

---

## HIGH-30: `jest-e2e.json` Uses `setupFiles` Instead of `setupFilesAfterEnv`
**File:** `mitra-backend/test/jest-e2e.json` (lines 13–15)
**Impact:** Custom matchers may not be available when tests run

**Fix:**
```json
"setupFilesAfterEnv": ["<rootDir>/test/jest.e2e.setup.ts"]
```

---

# MEDIUM FINDINGS (20)

---

## MED-1: Incorrect Pagination Search Validator (`@Max` instead of `@MaxLength`)
**File:** `src/common/dto/pagination.dto.ts` (lines 21–25)
**Fix:**
```typescript
@MaxLength(200)
search?: string;
```

---

## MED-2: No Password Complexity Requirements
**File:** `src/modules/platform/controllers/auth.controller.ts` (lines 30–54)
**Fix:** Add `@Matches` regex to `RegisterDto.password` (see CRIT-1 fix).

---

## MED-3: Inconsistent DTO Patterns Across Modules
**File:** Multiple controllers
**Fix:** Adopt uniform convention: every module has a `dto/` folder with decorated classes. No interfaces, no `Record<string, unknown>`.

---

## MED-4: Missing `@ApiOperation` on Most Endpoints
**File:** Multiple controllers
**Fix:** Add `@ApiOperation({ summary: '...' })` to every endpoint.

---

## MED-5: Global Email Uniqueness Instead of Per-Tenant
**File:** `src/modules/platform/services/auth.service.ts` (lines 114–117)
**Fix:** Add `tenantId` to uniqueness check (if per-tenant uniqueness is desired).

---

## MED-6: Missing Account Lockout Notification
**File:** `src/modules/platform/services/auth.service.ts` (lines 70–82)
**Fix:** Emit event or send notification when account is locked.

---

## MED-7: Missing `@VersionColumn()` for Optimistic Locking
**File:** `src/common/entities/industrial-base.entity.ts`
**Fix:** Add:
```typescript
@VersionColumn({ name: 'version', type: 'int', default: 0 })
version: number;
```
And add corresponding migration column.

---

## MED-8: Missing `@Column({ comment: '...' })` Documentation
**File:** All entity files
**Fix:** Add comments to key columns (passwordHash, JWT tokens, etc.).

---

## MED-9: Redundant `dotenv` Import & Logic in `seed.ts`
**File:** `src/database/seed.ts` (lines 2, 186–194)
**Fix:** Remove redundant check and consolidate `dotenv` import.

---

## MED-10: Redundant Entity Glob in `data-source.ts`
**File:** `src/database/data-source.ts` (lines 45–46)
**Fix:** Remove the `audit` glob (already covered by `modules/**/*.entity`).

---

## MED-11: `nest-cli.json` Missing `plugins` and `assets`
**File:** `mitra-backend/nest-cli.json` (lines 1–8)
**Fix:**
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true },
  "plugins": ["@nestjs/swagger"],
  "assets": [
    { "include": "**/*.sql", "outDir": "dist/" },
    { "include": "**/*.json", "outDir": "dist/" }
  ]
}
```

---

## MED-12: `package.json` Missing `engines`, `os`, `cpu` Fields
**File:** `mitra-backend/package.json`
**Fix:**
```json
"engines": { "node": ">=20.0.0 <21.0.0", "npm": ">=10.0.0" },
"os": ["linux", "darwin"],
"cpu": ["x64", "arm64"]
```

---

## MED-13: `package.json` Missing `repository`, `license`, `author`
**File:** `mitra-backend/package.json`
**Fix:** Add standard metadata fields.

---

## MED-14: Missing `docker-compose.override.yml` for Local Development
**File:** `mitra-backend/` (root)
**Fix:** Create `docker-compose.override.yml` with bind mounts for hot-reload.

---

## MED-15: Missing `Makefile` or `justfile`
**File:** `mitra-backend/` (root)
**Fix:** Create `Makefile` with targets for `build`, `test`, `lint`, `migrate`, `seed`, `up`, `down`.

---

## MED-16: Missing PostgreSQL Backup Strategy
**File:** `docker-compose.yml` / `podman-compose.yml`
**Fix:** Add `pg-backup` service or cron job for `pg_dump`.

---

## MED-17: `effective_cache_size` Set to 1GB (Should Be ~75% of RAM)
**File:** `docker-compose.yml` (line 73), `podman-compose.yml` (line 80)
**Fix:** Use `.env` variable: `${DB_EFFECTIVE_CACHE_SIZE:-12GB}`.

---

## MED-18: `work_mem` 4MB Too Low for Complex Queries
**File:** `docker-compose.yml` (line 71), `podman-compose.yml` (line 78)
**Fix:**
```yaml
-c work_mem=32MB
-c maintenance_work_mem=256MB
```

---

## MED-19: `shared_preload_libraries` Not Explicitly Configured for pgvector
**File:** `docker-compose.yml` / `podman-compose.yml`
**Fix:**
```yaml
-c shared_preload_libraries='pgvector'
```

---

## MED-20: Missing `VOLUME` and `LABEL` Metadata in Backend Dockerfile
**File:** `mitra-backend/Dockerfile`
**Fix:** Add:
```dockerfile
LABEL org.opencontainers.image.title="MITRA Backend"
LABEL org.opencontainers.image.version="3.2.0"
LABEL org.opencontainers.image.description="Mold Development Lifecycle Management Platform"
LABEL org.opencontainers.image.source="https://github.com/your-org/mitra"
LABEL org.opencontainers.image.licenses="MIT"
VOLUME ["/tmp", "/app/logs"]
```

---

# LOW FINDINGS (16)

---

## LOW-1: Health Endpoint Information Disclosure
**File:** `src/modules/health/health.controller.ts` (lines 38–48)
**Fix:** Remove `process.memoryUsage()` and `process.uptime()` from liveness probe.

---

## LOW-2: CORS Allows Requests Without Origin
**File:** `src/main.ts` (lines 96–100)
**Fix:** In production, require explicit origin:
```typescript
origin: (origin, cb) => {
  if (allowedOrigins.includes(origin ?? '')) return cb(null, true);
  cb(new Error('CORS blocked'));
},
```

---

## LOW-3: Missing CSRF Protection (Non-Critical for Bearer JWT)
**File:** `src/main.ts` (lines 96–106)
**Note:** LOW because JWT Bearer is used, not cookies. If cookies are ever added, implement CSRF tokens.

---

## LOW-4: Missing `@HttpCode` on Some Endpoints
**File:** Various controllers
**Fix:** Add explicit `@HttpCode()` decorators for consistency.

---

## LOW-5: `enableImplicitConversion` in ValidationPipe
**File:** `src/main.ts` (line 117)
**Fix:** Remove `enableImplicitConversion` and use explicit `@Type(() => Number)` decorators.

---

## LOW-6: Missing `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
**File:** `mitra-backend/` (root)
**Fix:** Create standard governance files. `CHANGELOG_v3.2.md` exists; rename or create `CHANGELOG.md`.

---

## LOW-7: Missing `.editorconfig` and `.prettierrc`
**File:** `mitra-backend/` (root)
**Fix:** Create `.editorconfig` and `.prettierrc`.

---

## LOW-8: No `README.md` in Repository Root
**File:** `C:\Users\Srikanth\Desktop\Mitra3.0\README.md` (does not exist)
**Fix:** Create `README.md` with quick-start, architecture, deployment instructions.

---

## LOW-9: Missing `ARG` for Build-Time Secrets in Backend Dockerfile
**File:** `mitra-backend/Dockerfile`
**Fix:** Document in `SECURITY.md` or add `ARG` for private registry tokens if needed.

---

## LOW-10: `prepare: husky` Script Fails Because `.husky` Directory Missing
**File:** `mitra-backend/package.json` (line 24)
**Fix:** Initialize husky:
```bash
cd mitra-backend
npx husky init
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## LOW-11: `ci.yml` Workflow Name Still References `v2.1`
**File:** `.github/workflows/ci.yml` (line 1)
**Fix:** `name: MITRA v3.2 CI`

---

## LOW-12: `npm ci --ignore-scripts` Prevents Postinstall Patches
**File:** `mitra-backend/Dockerfile` (lines 11, 31)
**Fix:** Document trade-off in `SECURITY.md`. If patches needed, use selective rebuild:
```dockerfile
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcryptjs --build-from-source
```

---

## LOW-13: `declaration: true` Emits Unnecessary `.d.ts` Files
**File:** `mitra-backend/tsconfig.json` (line 4)
**Fix:**
```json
"declaration": false
```

---

## LOW-14: `coverageDirectory` is Relative Path
**File:** `mitra-backend/package.json` (line 100)
**Fix:**
```json
"coverageDirectory": "<rootDir>/../coverage"
```

---

## LOW-15: Missing `webpack` Tree-Shaking Configuration
**File:** `mitra-backend/nest-cli.json`
**Fix:** Create `webpack.config.js` with optimization settings.

---

## LOW-16: `emitDecoratorMetadata: true` Causes Metadata Bloat
**File:** `mitra-backend/tsconfig.json` (line 6)
**Note:** Required by NestJS. Document as accepted risk in `SECURITY.md`.

---

## Positive Security Controls Observed

1. ✅ **Global Guard Registration:** `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `ThrottlerGuard` registered as `APP_GUARD`s
2. ✅ **TenantAwareService:** Well-designed base class for tenant isolation (though has TOCTOU and mass assignment issues)
3. ✅ **Refresh Token Rotation:** Old refresh token invalidated immediately upon use
4. ✅ **Account Lockout:** 5 failed attempts → 30 min lock
5. ✅ **Password Hashing:** `bcryptjs` with 12 rounds
6. ✅ **Helmet & CORS:** CSP in production, explicit origin allow-list
7. ✅ **Audit Interceptor:** Mutating operations logged with user, tenant, IP, user-agent
8. ✅ **Environment Validation:** `JWT_SECRET` and `DB_PASSWORD` enforced at startup
9. ✅ **Global ValidationPipe:** `whitelist: true`, `forbidNonWhitelisted: true`
10. ✅ **ClassSerializerInterceptor:** `@Exclude()` on sensitive fields supported globally
11. ✅ **Non-root container user:** `mitra` user in Dockerfile
12. ✅ **HEALTHCHECK:** Present in backend and compose
13. ✅ **Custom bridge network:** `mitra-internal` with subnet isolation
14. ✅ **npm audit in CI:** Backend CI includes vulnerability check

---

## Production Readiness Checklist

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| Tenant isolation enforced | ❌ Partial | CRIT-2, CRIT-3, CRIT-5, CRIT-7, CRIT-9, CRIT-10 |
| Mass assignment prevented | ❌ No | CRIT-1, CRIT-4, CRIT-6, CRIT-8 |
| Database schema consistent | ❌ No | CRIT-12, CRIT-13, CRIT-14, HIGH-15 |
| No known CVEs in dependencies | ❌ No | CRIT-15 |
| Redis authenticated | ❌ No | CRIT-17 |
| TLS/SSL enabled | ❌ No | CRIT-19 |
| Container security context | ❌ No | CRIT-18 |
| DB_SYNC disabled in production | ❌ Partial | CRIT-16 |
| Secrets in vault (not .env) | ❌ No | CRIT-19 |
| Input validation on all endpoints | ❌ Partial | CRIT-1, CRIT-4, HIGH-3, MED-3 |
| Pagination on all list endpoints | ❌ No | HIGH-9 |
| Audit logging for failures | ❌ No | HIGH-5 |
| Transaction wrapping for multi-step ops | ❌ No | CRIT-11 |
| ESLint with security rules | ❌ No | HIGH-21 |
| CI gates enforced (no `|| true`) | ❌ No | HIGH-23 |
| Container vulnerability scanning | ❌ No | HIGH-25 |
| Source maps disabled in production | ❌ No | HIGH-22 |
| `.dockerignore` present | ❌ No | HIGH-16 |
| `strict: true` in TypeScript | ❌ No | HIGH-18 |
| Password complexity enforced | ❌ No | MED-2 |
| Email verification | ❌ No | HIGH-6 |
| Rate limiting on all sensitive endpoints | ❌ Partial | HIGH-7 |
| Backup strategy | ❌ No | MED-16 |
| Optimistic locking | ❌ No | MED-7 |
| Unique constraints in entities | ❌ No | HIGH-14 |
| `onDelete` on FK relations | ❌ No | HIGH-13 |
| Missing DB indexes created | ❌ No | (Entity index drift — dozens missing) |

---

*End of Comprehensive Audit Report*
