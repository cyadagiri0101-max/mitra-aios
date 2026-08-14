# MITRA Backend Security Audit Report

**Date:** 2026-04-28
**Scope:** NestJS backend — Controllers, Auth System, Guards, DTOs, Services, and Global Configuration
**Auditor:** Security Auditor (Orchestrator)
**Total Files Reviewed:** 40+ modules, controllers, services, guards, decorators, DTOs, and `main.ts` / `app.module.ts`

---

## Executive Summary

The MITRA backend demonstrates a **mature multi-tenant architecture** with global `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard` registered as `APP_GUARD`s, a centralized `TenantAwareService` for IDOR protection, and a working audit interceptor. However, **several critical gaps remain** where tenant isolation is bypassed, DTO validation is circumvented by TypeScript interfaces, and mass assignment is possible via unvalidated `Record<string, unknown>` bodies. The most severe issues allow **cross-tenant project transitions**, **arbitrary password resets by admins**, and **unbounded file uploads**.

**Severity Distribution:**
| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 9 |
| MEDIUM | 6 |
| LOW | 5 |

---

## CRITICAL Findings

### CRIT-1: Mass Assignment + Missing Validation on User Creation & Update
**File:** `modules/platform/controllers/user.controller.ts` (lines 36–51, 53–62)
**File:** `modules/platform/services/user.service.ts` (lines 8–27, 102–115)

`CreateUserDto` and `UpdateUserDto` are **TypeScript interfaces**, not `class-validator` classes. At runtime the global `ValidationPipe` sees `Object` and **cannot validate or whitelist anything**. An attacker (or admin) can send arbitrary fields such as `roleId`, `status`, `password`, or `tenantId` and they pass straight through to the service.

**Impact:** ADMIN can reset any user’s password without knowing the old one (see CRIT-6), escalate privileges via `roleId`, or mutate internal fields.

**Problem code:**
```typescript
// user.controller.ts
import { UserService, CreateUserDto, UpdateUserDto } from '../services/user.service';

@Post()
async create(@Body() body: CreateUserDto, ...) {   // Runtime type = Object
  return this.userService.create({ ...body, tenantId: user.tenantId ?? undefined }, user.id);
}

@Patch(':id')
async update(@Body() body: UpdateUserDto, ...) {   // Runtime type = Object
  return this.userService.update(id, body, user.id, user.tenantId);
}
```

**Suggested fix:** Replace interfaces with concrete, decorated DTO classes.

```typescript
// modules/platform/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(64) password: string;
  @ApiProperty() @IsString() @MinLength(2) firstName: string;
  @ApiProperty() @IsString() @MinLength(2) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

// modules/platform/dto/update-user.dto.ts
import { PartialType } from '@nestjs/swagger';
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

Then update the controller:
```typescript
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Post()
async create(@Body() body: CreateUserDto, ...) { ... }

@Patch(':id')
async update(@Body() body: UpdateUserDto, ...) { ... }
```

---

### CRIT-2: Cross-Tenant Project Transition
**File:** `modules/project/services/project.service.ts` (lines 129–152)

`transitionStage()` calls `await this.findOne(id)` **without passing `tenantId`**, which skips the tenant isolation gate entirely. Any authenticated user holding `project:transition` permission can transition any project in any tenant.

**Problem code:**
```typescript
async transitionStage(id: string, toStage: string, userId: string, remarks?: string) {
  const project = await this.findOne(id);   // tenantId omitted → isolation bypassed
  ...
}
```

**Suggested fix:** Require `tenantId` and enforce it in the controller and service.

```typescript
// project.service.ts
async transitionStage(id: string, toStage: string, userId: string, tenantId?: string | null, remarks?: string) {
  const project = await this.findOne(id, tenantId);   // enforce tenant isolation
  ...
}

// project.controller.ts
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

### CRIT-3: Cross-Tenant Project Health Computation
**File:** `modules/project/services/project.service.ts` (lines 156–221)

`computeHealth()` also calls `await this.findOne(id)` without `tenantId`. Any authenticated user can read health data (overdue milestones, budget variance) for any project.

**Problem code:**
```typescript
async computeHealth(id: string): Promise<HealthCheckResult> {
  const project = await this.findOne(id);   // tenantId omitted
  ...
}
```

**Suggested fix:** Same pattern as CRIT-2 — pass `tenantId` and enforce it.

```typescript
async computeHealth(id: string, tenantId?: string | null): Promise<HealthCheckResult> {
  const project = await this.findOne(id, tenantId);
  ...
}
```

---

### CRIT-4: Mass Assignment in Tenant Management
**File:** `modules/platform/controllers/tenant.controller.ts` (lines 37–43, 45–52)
**File:** `modules/platform/services/tenant.service.ts` (lines 37–48)

`TenantController` accepts `Record<string, unknown>` for both `create` and `update`. `TenantService` performs `Object.assign(entity, data, ...)` with no validation or whitelisting. Any field present on the `Tenant` entity can be injected, including internal fields.

**Problem code:**
```typescript
// tenant.controller.ts
@Post()
async create(@Body() body: Record<string, unknown>, ...) {
  return this.tenantService.create(body, user.id);
}

@Patch(':id')
async update(@Body() body: Record<string, unknown>, ...) {
  return this.tenantService.update(id, body, user.id);
}

// tenant.service.ts
async create(data: Record<string, any>, userId?: string) {
  const entity = this.repository.create({ ...data, ...(userId ? { createdBy: userId, updatedBy: userId } : {}) } as any);
  return this.repository.save(entity);
}

async update(id: string, data: Record<string, any>, userId?: string) {
  const entity = await this.findOne(id);
  Object.assign(entity, data, userId ? { updatedBy: userId } : {});
  return this.repository.save(entity);
}
```

**Suggested fix:** Define strict DTOs for tenant mutations.

```typescript
// modules/platform/dto/create-tenant.dto.ts
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

### CRIT-5: Cross-Tenant Workflow Instance Access & Transition
**File:** `modules/workflow/services/workflow.service.ts` (lines 122–191, 193–199, 201–206)

`executeTransition()`, `getInstanceHistory()`, and `findInstanceByEntity()` do **not** verify that the workflow instance belongs to the caller’s tenant. An authenticated user can transition or read history for any entity in any tenant.

**Problem code:**
```typescript
async executeTransition(instanceId: string, transitionId: string, context: WorkflowContext) {
  const instance = await this.instanceRepository.findOne({
    where: { id: instanceId, deletedAt: IsNull() },   // no tenantId filter
    relations: ['currentState'],
  });
  ...
}

async getInstanceHistory(instanceId: string) {
  const instance = await this.instanceRepository.findOne({
    where: { id: instanceId, deletedAt: IsNull() },   // no tenantId filter
  });
  ...
}

async findInstanceByEntity(entityType: string, entityId: string) {
  return this.instanceRepository.findOne({
    where: { entityType, entityId, deletedAt: IsNull() },   // no tenantId filter
  });
}
```

**Suggested fix:** Enforce tenant isolation in all three methods.

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

Update the controller to pass `tenantId`:
```typescript
@Get('instance/entity/:entityType/:entityId')
async getForEntity(@Param('entityType') type: string, @Param('entityId') id: string, @CurrentUser() user: AuthUser) {
  return this.workflowService.findInstanceByEntity(type, id, user.tenantId ?? undefined);
}

@Get('instance/:instanceId/history')
async getHistory(@Param('instanceId') id: string, @CurrentUser() user: AuthUser) {
  return this.workflowService.getInstanceHistory(id, user.tenantId ?? undefined);
}
```

---

### CRIT-6: Arbitrary Password Reset Without Old Password Verification
**File:** `modules/platform/services/user.service.ts` (lines 102–115)

`UserService.update()` hashes a new password if `dto.password` is present **without requiring the old password**. An ADMIN (or any role permitted to `PATCH /users/:id`) can reset any user’s password to anything.

**Problem code:**
```typescript
async update(id: string, dto: UpdateUserDto, userId: string, tenantId?: string | null) {
  const user = await this.findOne(id, tenantId);
  if (dto.password) {
    user.passwordHash = await bcrypt.hash(dto.password, 12);   // no old-password check
  }
  ...
}
```

**Suggested fix:** Remove `password` from `UpdateUserDto` and enforce password changes only via `AuthController.changePassword`, which already requires the old password.

```typescript
// update-user.dto.ts (remove password field)
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
```

If an admin password-reset feature is required, create a separate admin-only endpoint:
```typescript
@Post(':id/reset-password')
@UseGuards(RolesGuard)
@Roles('ADMIN')
async adminResetPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
  // generate secure random password, hash it, return it once
}
```

---

## HIGH Findings

### HIGH-1: Missing Tenant Isolation in Drawing, BOM, and Machine Status Controllers
**File:** `modules/drawing-analysis/controllers/drawing-analysis.controller.ts` (lines 35–55)
**File:** `modules/bom-analysis/controllers/bom-analysis.controller.ts` (lines 35–55)
**File:** `modules/machine-status/controllers/machine-status.controller.ts` (lines 35–62)

`getById()` and `getByProject()` (or `getAll()`, `getSummary()`) endpoints **do not pass `tenantId`** to the underlying services. If the services lack their own isolation checks, this is a direct cross-tenant data leak.

**Problem code (drawing-analysis.controller.ts):**
```typescript
@Get(':id')
async getById(@Param('id') id: string): Promise<DrawingAnalysisResponseDto> {
  return this.drawingAnalysisService.getAnalysis(id);   // tenantId missing
}

@Get('project/:projectId')
async getByProject(@Param('projectId') projectId: string): Promise<DrawingAnalysisResponseDto[]> {
  return this.drawingAnalysisService.getProjectAnalyses(projectId);   // tenantId missing
}
```

**Suggested fix:**
```typescript
@Get(':id')
async getById(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<DrawingAnalysisResponseDto> {
  return this.drawingAnalysisService.getAnalysis(id, user.tenantId ?? undefined);
}

@Get('project/:projectId')
async getByProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser): Promise<DrawingAnalysisResponseDto[]> {
  return this.drawingAnalysisService.getProjectAnalyses(projectId, user.tenantId ?? undefined);
}
```

Apply the same pattern to `bom-analysis.controller.ts` and `machine-status.controller.ts`.

---

### HIGH-2: Missing Tenant Isolation in AI Usage Controller
**File:** `modules/ai-usage/controllers/ai-usage.controller.ts` (lines 23–58)

`track()`, `getStats()`, and `getUserStats()` do not pass `tenantId` to the service. If the AI usage records are tenant-scoped, this is a cross-tenant data leak.

**Problem code:**
```typescript
@Post('track')
async track(@Body() dto: AiUsageDto): Promise<AiUsageRecord> {
  return this.aiUsageService.trackUsage(dto);   // tenantId missing
}

@Get('stats')
async getStats(@Query('days') days?: string): Promise<AiUsageSummaryDto> {
  return this.aiUsageService.getStats(days ? parseInt(days, 10) : 7);   // tenantId missing
}

@Get('user/:userId')
async getUserStats(@Param('userId') userId: string, ...): Promise<AiUsageSummaryDto> {
  return this.aiUsageService.getUserUsage(userId, days ? parseInt(days, 10) : 30);   // tenantId missing
}
```

**Suggested fix:**
```typescript
@Post('track')
async track(@Body() dto: AiUsageDto, @CurrentUser() user: AuthUser): Promise<AiUsageRecord> {
  return this.aiUsageService.trackUsage({ ...dto, tenantId: user.tenantId ?? undefined });
}

@Get('stats')
async getStats(@Query('days') days?: string, @CurrentUser() user: AuthUser): Promise<AiUsageSummaryDto> {
  return this.aiUsageService.getStats(user.tenantId ?? undefined, days ? parseInt(days, 10) : 7);
}

@Get('user/:userId')
async getUserStats(@Param('userId') userId: string, @Query('days') days?: string, @CurrentUser() user: AuthUser): Promise<AiUsageSummaryDto> {
  return this.aiUsageService.getUserUsage(userId, user.tenantId ?? undefined, days ? parseInt(days, 10) : 30);
}
```

---

### HIGH-3: Missing Input Validation on Role Update (Partial<CreateRoleDto>)
**File:** `modules/platform/controllers/role.controller.ts` (lines 51–60)

`Partial<CreateRoleDto>` is a TypeScript utility type, not a runtime class. The global `ValidationPipe` cannot validate it because there is no class metadata at runtime. This allows mass assignment of any `Role` entity field during updates.

**Problem code:**
```typescript
@Patch(':id')
async update(@Body() body: Partial<CreateRoleDto>, ...) {
  return this.roleService.update(id, body, user.id, user.tenantId ?? undefined);
}
```

**Suggested fix:** Define a concrete `UpdateRoleDto` class.

```typescript
// modules/platform/dto/update-role.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
```

```typescript
// role.controller.ts
@Patch(':id')
async update(@Body() body: UpdateRoleDto, ...) { ... }
```

---

### HIGH-4: Unbounded File Upload via Base64
**File:** `modules/drawing-analysis/controllers/drawing-analysis.controller.ts` (lines 22–33)
**File:** `modules/drawing-analysis/dto/drawing-analysis.dto.ts` (lines 7–23)

`UploadDrawingDto.fileContentBase64` is validated only as `@IsString()`. There is **no length limit** or actual file type validation. An attacker can send a multi-gigabyte base64 string causing memory exhaustion or DoS.

**Problem code:**
```typescript
export class UploadDrawingDto {
  @ApiProperty({ description: 'Base64-encoded file content' })
  @IsString()
  fileContentBase64: string;
}
```

**Suggested fix:** Add a length limit and validate the decoded size in the service.

```typescript
export class UploadDrawingDto {
  @ApiProperty({ description: 'Base64-encoded file content' })
  @IsString()
  @MaxLength(50_000_000)   // ~37 MB raw limit
  fileContentBase64: string;
}
```

In the service, also verify the decoded buffer size:
```typescript
const decoded = Buffer.from(dto.fileContentBase64, 'base64');
if (decoded.length > 25 * 1024 * 1024) {
  throw new BadRequestException('File size exceeds 25 MB limit');
}
```

---

### HIGH-5: Failed Mutating Operations Are Not Audited
**File:** `common/interceptors/audit.interceptor.ts` (lines 33–87)

The `AuditInterceptor` uses `tap()` which only executes on **successful** responses. Failed login attempts, unauthorized mutations, validation errors, and exceptions are **never persisted** to the audit log.

**Problem code:**
```typescript
return next.handle().pipe(
  tap(async () => {
    // This only runs when the handler succeeds
    ...
  }),
);
```

**Suggested fix:** Use `catchError` or a `finalize`-style operator to log both success and failure. Alternatively, log in the guard/service layer for sensitive events.

```typescript
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

return next.handle().pipe(
  tap(async (response) => { await this.logEvent(context, request, response, null); }),
  catchError(async (err) => {
    await this.logEvent(context, request, null, err);
    throw err;
  }),
);
```

---

### HIGH-6: Missing Email Verification on Registration
**File:** `modules/platform/services/auth.service.ts` (lines 113–130)

`register()` immediately creates the user with `status: 'active'`. There is no email verification step, allowing registration with unverified email addresses.

**Problem code:**
```typescript
async register(dto: RegisterDto) {
  ...
  const user = this.userRepository.create({
    ...
    status: 'active',
    ...
  });
  return this.userRepository.save(user);
}
```

**Suggested fix:** Introduce a `status: 'pending'` state and send a verification token via email.

```typescript
const user = this.userRepository.create({
  ...
  status: 'pending',
  emailVerificationToken: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
  emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  ...
});
// send email with verification link
```

---

### HIGH-7: No Rate Limiting on Refresh Token Endpoint
**File:** `modules/platform/controllers/auth.controller.ts` (lines 90–96)

The `POST /auth/refresh` endpoint is `@Public()` and has **no `@Throttle()` decorator**. Although the global `ThrottlerGuard` (100 req/min) applies, a dedicated lower limit should protect this sensitive endpoint.

**Problem code:**
```typescript
@Public()
@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(@Body() body: RefreshTokenDto) {
  return this.authService.refreshToken(body.refreshToken);
}
```

**Suggested fix:**
```typescript
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(@Body() body: RefreshTokenDto) {
  return this.authService.refreshToken(body.refreshToken);
}
```

---

### HIGH-8: Missing Tenant Isolation on Email Lookup
**File:** `modules/platform/services/user.service.ts` (lines 72–77)

`findByEmail()` returns the first user with the matching email across **all tenants**. If used for lookups or duplicate checks, it can leak cross-tenant existence or return the wrong user.

**Problem code:**
```typescript
async findByEmail(email: string) {
  return this.userRepository.findOne({
    where: { email, deletedAt: IsNull() },
    relations: ['role', 'role.permissions'],
  });
}
```

**Suggested fix:**
```typescript
async findByEmail(email: string, tenantId?: string | null) {
  const where: any = { email, deletedAt: IsNull() };
  if (tenantId) where.tenantId = tenantId;
  return this.userRepository.findOne({ where, relations: ['role', 'role.permissions'] });
}
```

---

### HIGH-9: Missing Pagination on List Endpoints
**File:** `modules/dispatch/controllers/dispatch.controller.ts` (line 22–28)
**File:** `modules/machine-status/controllers/machine-status.controller.ts` (line 35–42)
**File:** `modules/workflow/controllers/workflow.controller.ts` (line 54–58)
**File:** `modules/bom-analysis/controllers/bom-analysis.controller.ts` (line 46–55)
**File:** `modules/drawing-analysis/controllers/drawing-analysis.controller.ts` (line 46–55)

Several `findAll` or `getByProject` endpoints return **all records** without pagination, creating DoS vectors when data grows.

**Problem code (dispatch.controller.ts):**
```typescript
@Get()
findAll(@CurrentUser() user: AuthUser) {
  return this.svc.findAll(user.tenantId ?? 'default');   // no pagination
}
```

**Suggested fix:** Add `PaginationDto` query parameter and enforce limits in the service.

```typescript
@Get()
findAll(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
  return this.svc.findAll(user.tenantId ?? 'default', q.page ?? 1, q.limit ?? 20);
}
```

---

## MEDIUM Findings

### MED-1: Incorrect Pagination Search Validator (`@Max` instead of `@MaxLength`)
**File:** `common/dto/pagination.dto.ts` (lines 21–25)

The `search` field uses `@Max(200)` which is a **number validator** and has no effect on strings. This allows unbounded search strings, enabling DoS via extremely long queries.

**Problem code:**
```typescript
@ApiPropertyOptional()
@IsOptional()
@IsString()
@Max(200)
search?: string;
```

**Suggested fix:**
```typescript
@ApiPropertyOptional()
@IsOptional()
@IsString()
@MaxLength(200)
search?: string;
```

---

### MED-2: No Password Complexity Requirements
**File:** `modules/platform/controllers/auth.controller.ts` (lines 30–54)

`RegisterDto.password` only enforces `@MinLength(8)`. There is no requirement for uppercase, lowercase, digits, or special characters, allowing weak passwords like `password1`.

**Suggested fix:** Add a custom validator or regex.

```typescript
import { Matches } from 'class-validator';

class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must contain at least one uppercase, one lowercase, one number, and one special character',
  })
  password: string;
  ...
}
```

---

### MED-3: Inconsistent DTO Patterns Across Modules
**File:** Multiple controllers

- **AuthController:** Inline DTO classes with decorators ✅
- **UserController:** Interfaces imported from service ❌ (no validation)
- **ProjectController:** DTO classes imported from `../dto/project.dto` ✅
- **RoleController:** Inline class, but `Partial<CreateRoleDto>` for update ❌
- **TenantController:** `Record<string, unknown>` ❌

This inconsistency leads to validation gaps and maintenance overhead. Adopt a uniform convention: **every module has a `dto/` folder with decorated classes**.

---

### MED-4: Missing `@ApiOperation` on Most Endpoints
**File:** Multiple controllers

`UserController`, `RoleController`, `TenantController`, and many others lack `@ApiOperation()` on individual endpoints, making Swagger documentation incomplete.

**Suggested fix:** Add `@ApiOperation({ summary: '...' })` to every endpoint.

```typescript
@Get()
@ApiOperation({ summary: 'List all users (paginated, tenant-scoped)' })
async findAll(...) { ... }
```

---

### MED-5: Global Email Uniqueness Instead of Per-Tenant
**File:** `modules/platform/services/auth.service.ts` (lines 114–117)
**File:** `modules/platform/services/user.service.ts` (lines 80–83)

Both `register()` and `create()` enforce email uniqueness globally. In a multi-tenant SaaS, it is common to allow the same email in different tenants unless a global identity provider is used.

**Suggested fix:** Decide the architecture. If per-tenant uniqueness is desired:

```typescript
const where: any = { email: dto.email, deletedAt: IsNull() };
if (dto.tenantId) where.tenantId = dto.tenantId;
const existing = await this.userRepository.findOne({ where });
```

---

### MED-6: Missing Account Lockout Notification
**File:** `modules/platform/services/auth.service.ts` (lines 70–82)

When an account is locked after 5 failed attempts, **no notification is sent** to the user or admin. The user only sees a generic message on the next login attempt.

**Suggested fix:** Emit an event or send an email/SMS when `lockedUntil` is set.

```typescript
if (user.failedLoginAttempts >= 5) {
  user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  // await this.notificationService.sendAccountLockoutEmail(user.email, user.lockedUntil);
}
```

---

## LOW Findings

### LOW-1: Health Endpoint Information Disclosure
**File:** `modules/health/health.controller.ts` (lines 38–48)

The `liveness` probe exposes `process.memoryUsage()` and `process.uptime()`. While low-risk for a health endpoint, this reveals internal process state.

**Suggested fix:** Remove sensitive fields or restrict the endpoint to internal network only.

```typescript
liveness(): Record<string, unknown> {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

---

### LOW-2: CORS Allows Requests Without Origin
**File:** `main.ts` (lines 96–100)

The CORS callback allows requests with `!origin` (no Origin header), which permits server-to-server and curl-based requests. While standard for APIs, combined with `credentials: true`, it could be risky if cookie-based auth is ever introduced.

**Suggested fix:** In production, consider requiring an origin or using an explicit allow-list without the `!origin` fallback.

```typescript
origin: (origin: string | undefined, cb) => {
  if (allowedOrigins.includes(origin ?? '')) return cb(null, true);
  cb(new Error('CORS blocked'));
},
```

---

### LOW-3: Missing CSRF Protection (Non-Critical for Bearer JWT)
**File:** `main.ts` (lines 96–106)

The application uses `credentials: true` but does not implement CSRF tokens. However, since authentication is **JWT Bearer token** (explicit `Authorization` header), CSRF is not applicable. This is noted as a LOW finding only because the `credentials: true` flag suggests cookies may be used elsewhere.

**Suggested fix:** If cookies are ever used for session management, implement CSRF tokens (e.g., `csurf` or NestJS `CsurfMiddleware`).

---

### LOW-4: Missing `@HttpCode` on Some Endpoints
**File:** Various controllers

Several endpoints rely on implicit `200 OK` instead of explicit `@HttpCode()` decorators. For example, `UserController.delete` returns `200` but `ProjectController.delete` also returns `200` with explicit decorator. Consistency improves API clarity.

---

### LOW-5: `enableImplicitConversion` in ValidationPipe
**File:** `main.ts` (line 117)

`transformOptions: { enableImplicitConversion: true }` can cause unexpected type coercion (e.g., `'1'` → `1`). While not directly exploitable, it can lead to subtle bugs where string inputs are silently converted to numbers.

**Suggested fix:** Remove `enableImplicitConversion` and rely on explicit `@Type(() => Number)` decorators in DTOs.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
  }),
);
```

---

## Remediation Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P0 | CRIT-1: User DTO interfaces → classes | Medium | Mass assignment, privilege escalation |
| P0 | CRIT-2: Cross-tenant project transition | Low | Broken tenant isolation |
| P0 | CRIT-3: Cross-tenant health computation | Low | Broken tenant isolation |
| P0 | CRIT-4: Tenant management mass assignment | Medium | Mass assignment on root entities |
| P0 | CRIT-5: Cross-tenant workflow access | Medium | Broken tenant isolation |
| P0 | CRIT-6: Password reset without old password | Low | Privilege escalation |
| P1 | HIGH-1: Missing tenant isolation (Drawing/BOM/Machine) | Medium | Cross-tenant data leak |
| P1 | HIGH-2: Missing tenant isolation (AI Usage) | Low | Cross-tenant data leak |
| P1 | HIGH-3: Role update uses Partial<CreateRoleDto> | Low | Mass assignment |
| P1 | HIGH-4: Unbounded file upload | Low | DoS / memory exhaustion |
| P1 | HIGH-5: Failed operations not audited | Medium | Compliance / forensics gap |
| P1 | HIGH-6: No email verification | High | Account security |
| P1 | HIGH-7: No rate limit on refresh | Low | Token brute-force |
| P1 | HIGH-8: findByEmail missing tenant | Low | Information disclosure |
| P1 | HIGH-9: Missing pagination on lists | Low | DoS |
| P2 | MED-1: @Max → @MaxLength on search | Trivial | DoS via long query |
| P2 | MED-2: Password complexity | Low | Weak credentials |
| P2 | MED-3: Unify DTO patterns | Medium | Maintainability |
| P2 | MED-4: Missing @ApiOperation | Low | Documentation |
| P2 | MED-5: Global email uniqueness | Low | Architecture decision |
| P2 | MED-6: Account lockout notification | Medium | UX / security |
| P3 | LOW-1–LOW-5 | Low | Hardening |

---

## Positive Security Controls Observed

1. **Global Guard Registration:** `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, and `ThrottlerGuard` are registered as `APP_GUARD`s in `AppModule`, ensuring uniform protection.
2. **TenantAwareService:** A well-designed abstract base class (`TenantAwareService`) enforces tenant isolation for CRUD operations across most domain modules.
3. **Refresh Token Rotation:** `AuthService.refreshToken()` implements **token rotation** — the old refresh token is invalidated immediately upon use.
4. **Account Lockout:** `validateUser()` implements progressive lockout (5 attempts → 30 min lock).
5. **Password Hashing:** `bcryptjs` with 12 rounds is used consistently.
6. **Helmet & CORS:** `helmet()` is configured with CSP in production, and CORS uses an explicit origin allow-list.
7. **Audit Interceptor:** All successful mutating operations are automatically logged with user, tenant, IP, and user-agent.
8. **Environment Validation:** `validateEnv()` in `main.ts` forces `JWT_SECRET` and `DB_PASSWORD` to be present and non-placeholder at startup.
9. **Global ValidationPipe:** `whitelist: true` and `forbidNonWhitelisted: true` are enabled globally (though circumvented by interfaces).
10. **ClassSerializerInterceptor:** `@Exclude()` on sensitive fields is supported globally via `ClassSerializerInterceptor`.

---

*End of Report*
