# MITRA Backend — Database & Entity Audit Report

**Audit Date:** 2026-01-18  
**Scope:** All TypeORM entities, migrations (`database/migrations/`), data-source, seed script, and schema validator.  
**Method:** Manual entity↔migration cross-reference, constraint & index verification, type normalization, and PII/sensitive-data review.

---

## Executive Summary

| Severity | Count | Categories |
|----------|-------|------------|
| **CRITICAL** | 7 | Missing DB tables, missing columns, type mismatches, missing unique constraints, length mismatches |
| **HIGH** | 5 | Missing `onDelete` on relations, missing enum typing, missing indexes, validator bug, missing `@Column({ type: 'jsonb' })` |
| **MEDIUM** | 3 | Missing `@VersionColumn`, missing `@Column({ comment })`, inconsistent non-UUID primary keys |
| **LOW** | 2 | Code style / redundant logic in seed.ts, redundant entity glob in data-source.ts |

---

## CRITICAL FINDINGS

### 1. Missing Database Tables (6 entities have no migration)

These entities extend `IndustrialBaseEntity` and declare `@Entity(...)`, but **no migration creates their corresponding tables**. Running `schema:validate` or `migration:run` on a fresh DB will fail with "relation does not exist".

| Entity File | Table Name | Line |
|-------------|------------|------|
| `modules/drawing-analysis/entities/drawing-analysis.entity.ts` | `drawing_analyses` | 13 |
| `modules/ai-usage/entities/ai-usage-record.entity.ts` | `ai_usage_records` | 6 |
| `modules/machine-status/entities/machine-status.entity.ts` | `machine_status` | 6 |
| `modules/machine-status/entities/machine-telemetry.entity.ts` | `machine_telemetry` | 14 |
| `modules/bom-analysis/entities/bom-analysis.entity.ts` | `bom_analyses` | 7 |
| `modules/bom-analysis/entities/bom-item.entity.ts` | `bom_items` | 7 |

**Suggested fix:** Add a new migration (e.g., `1700000000004-MissingTables.ts`) that creates all 6 tables with the same soft-delete pattern (`created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `tenant_id`). Example snippet for `drawing_analyses`:

```sql
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
);
CREATE INDEX IF NOT EXISTS "IDX_drawing_analyses_tnt_del" ON "drawing_analyses" ("tenant_id", "deleted_at");
```

Repeat the same pattern for the remaining 5 tables.

---

### 2. Missing Column in Migration: `audit_logs.event_type`

**Entity:** `modules/audit/entities/audit-log.entity.ts` (line 30)  
**Migration:** `database/migrations/1700000000000-InitialSchema.ts` (lines 237–258)

The entity declares:

```typescript
@Column({ name: 'event_type', type: 'enum', enum: AuditEventType, default: AuditEventType.CRUD })
eventType: AuditEventType;
```

The migration `InitialSchema` creates `audit_logs` with **no `event_type` column**:

```sql
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "tenant_id" UUID,
  "user_id" UUID,
  "user_email" VARCHAR(255),
  "action" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" VARCHAR(100) NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB,
  "reason" TEXT,
  "ip_address" VARCHAR(50),
  "user_agent" TEXT,
  "metadata" JSONB,
  CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
);
```

**Suggested fix:** Add an `ALTER TABLE` in a new migration:

```sql
ALTER TABLE "audit_logs"
ADD COLUMN IF NOT EXISTS "event_type" VARCHAR(20) NOT NULL DEFAULT 'CRUD';
```

---

### 3. `simple-json` Entity ↔ `jsonb` Migration Type Mismatch (18 columns)

TypeORM stores `simple-json` as a **JSON-stringified `text` column**. The migrations correctly use native PostgreSQL `JSONB`. When the schema validator runs, it sees `entityType: text` vs `dbType: jsonb` and will flag every one of these as a mismatch. Worse, TypeORM may accidentally down-cast JSONB to text on some operations.

**Affected columns:**

| Entity File | Column | Entity Line | Migration Line |
|-------------|--------|-------------|----------------|
| `modules/collaboration/entities/activitylog.entity.ts` | `changes` | 31 | `FullDomainSchema` activity_logs |
| `modules/collaboration/entities/activitylog.entity.ts` | `metadata` | 34 | `FullDomainSchema` activity_logs |
| `modules/collaboration/entities/comment.entity.ts` | `mentionedUsers` | 33 | `FullDomainSchema` comments |
| `modules/collaboration/entities/customfield.entity.ts` | `selectOptions` | 36 | `FullDomainSchema` custom_fields |
| `modules/collaboration/entities/customfieldvalue.entity.ts` | `jsonValue` | 30 | `FullDomainSchema` custom_field_values |
| `modules/collaboration/entities/note.entity.ts` | `visibilityRoles` | 29 | `FullDomainSchema` notes |
| `modules/collaboration/entities/note.entity.ts` | `mentionedUsers` | 32 | `FullDomainSchema` notes |
| `modules/knowledge/entities/knowledgearticle.entity.ts` | `tags` | 30 | `FullDomainSchema` knowledge_articles |
| `modules/knowledge/entities/knowledgearticle.entity.ts` | `relatedModules` | 33 | `FullDomainSchema` knowledge_articles |
| `modules/search/entities/searchindex.entity.ts` | `keywords` | 20 | `FullDomainSchema` search_indexes |
| `modules/search/entities/searchindex.entity.ts` | `metadata` | 23 | `FullDomainSchema` search_indexes |
| `modules/service/entities/servicereport.entity.ts` | `partsReplaced` | 25 | `FullDomainSchema` service_reports |
| `modules/quality/entities/trialobservation.entity.ts` | `defectsObserved` | 58 | `FullDomainSchema` trial_observations |
| `modules/quality/entities/retrialresult.entity.ts` | `issuesResolved` | 20 | `FullDomainSchema` retrial_results |
| `modules/quality/entities/retrialresult.entity.ts` | `pendingIssues` | 23 | `FullDomainSchema` retrial_results |
| `modules/quality/entities/inspectionreport.entity.ts` | `defectsFound` | 43 | `FullDomainSchema` inspection_reports |
| `modules/customer/entities/customerapproval.entity.ts` | `pendingActions` | 50 | `FullDomainSchema` customer_approvals |
| `modules/cps/entities/cpschecklist.entity.ts` | `categories` | 30 | `FullDomainSchema` cps_checklists |
| `modules/cps/entities/cpsrequirement.entity.ts` | `appliesToMoldTypes` | 31 | `FullDomainSchema` cps_requirements |
| `modules/planning/entities/processstep.entity.ts` | `qualityCheckpoints` | 28 | `FullDomainSchema` process_steps |
| `modules/document/entities/documentversion.entity.ts` | `accessRoles` | 75 | `FullDomainSchema` document_versions |
| `modules/document/entities/documentversion.entity.ts` | `tags` | 78 | `FullDomainSchema` document_versions |
| `modules/customer/entities/customerapprovalhistory.entity.ts` | `metadata` | 31 | `FullDomainSchema` customer_approval_history |

**Suggested fix:** Replace `type: 'simple-json'` with `type: 'jsonb'` in every affected column. Example for `activitylog.entity.ts` line 31:

```typescript
// BEFORE
@Column({ type: 'simple-json', nullable: true })
changes: Record<string, { from: any; to: any }> | null;

// AFTER
@Column({ type: 'jsonb', nullable: true })
changes: Record<string, { from: any; to: any }> | null;
```

---

### 4. Missing Unique Constraints in Entities (6 missing `@Unique()` / `unique: true`)

The migrations create unique indexes/constraints, but the entities do not declare them. This means TypeORM is unaware of the constraint; `synchronize: true` would not recreate them, and query builders cannot rely on them for deduplication.

| Entity | Missing Unique | Entity File | Migration Reference |
|--------|----------------|-------------|-------------------|
| `Tenant` | `code` | `tenant.entity.ts` line 9 | `uq_tenants_code` |
| `User` | `email + tenantId` | `user.entity.ts` lines 9–10 | `uq_users_email_tenant` |
| `Permission` | `resource + action` | `permission.entity.ts` lines 7–11 | `uq_permissions_resource_action` |
| `RolePermission` | `roleId + permissionId` | `role-permission.entity.ts` lines 8–22 | `uq_role_permission` |
| `Project` | `projectNumber + tenantId` | `project.entity.ts` line 45 | `uq_projects_number_tenant` |
| `WorkflowInstance` | `entityType + entityId` | `workflow-instance.entity.ts` lines 21–25 | `uq_workflow_entity` |

**Suggested fixes:**

```typescript
// tenant.entity.ts
@Unique(['code'])
@Entity('tenants')
export class Tenant extends IndustrialBaseEntity { ... }

// user.entity.ts
@Unique(['email', 'tenantId'])
@Entity('users')
export class User extends IndustrialBaseEntity { ... }

// permission.entity.ts
@Unique(['resource', 'action'])
@Entity('permissions')
export class Permission extends IndustrialBaseEntity { ... }

// role-permission.entity.ts
@Unique(['roleId', 'permissionId'])
@Entity('role_permissions')
export class RolePermission extends IndustrialBaseEntity { ... }

// project.entity.ts
@Unique(['projectNumber', 'tenantId'])
@Entity('projects')
export class Project extends IndustrialBaseEntity { ... }

// workflow-instance.entity.ts
@Unique(['entityType', 'entityId'])
@Entity('workflow_instances')
export class WorkflowInstance extends IndustrialBaseEntity { ... }
```

---

### 5. Varchar Length Mismatches (7 fields)

| Entity File | Field | Entity Length | Migration Length | Lines |
|-------------|-------|-------------|------------------|-------|
| `tenant.entity.ts` | `name` | 100 | 255 | 6 vs `InitialSchema` line 32 |
| `role.entity.ts` | `name` | 50 | 100 | 8 vs `InitialSchema` line 52 |
| `permission.entity.ts` | `resource` | 50 | 100 | 7 vs `InitialSchema` line 70 |
| `workflow-instance.entity.ts` | `entityType` | 50 | 100 | 21 vs `InitialSchema` line 182 |
| `project.entity.ts` | `projectNumber` | 30 | 50 | 45 vs `InitialSchema` line 203 |
| `project.entity.ts` | `rfqNumber` | 50 | 100 | 105 vs `InitialSchema` line 220 |
| `project.entity.ts` | `poNumber` | 50 | 100 | 108 vs `InitialSchema` line 221 |

**Suggested fix:** Align entity `length` to match migration. Example for `tenant.entity.ts`:

```typescript
@Column({ type: 'varchar', length: 255 })  // was 100
name: string;
```

---

### 6. Missing `CHECK` / Enum Declaration: `DispatchPlan.status`

**Entity:** `modules/dispatch/entities/dispatchplan.entity.ts` line 25–26  
**Migration:** `database/migrations/1700000000003-DispatchPlans.ts` line 25

The entity defines `DispatchStatus` enum but then uses a plain `varchar`:

```typescript
// dispatchplan.entity.ts (line 25)
@Column({ type: 'varchar', length: 20, default: DispatchStatus.PLANNING })
status: string;
```

The migration correctly creates a `CHECK` constraint:

```sql
CONSTRAINT "CHK_dispatch_status" CHECK (
  "status" IN ('PLANNING','PACKED','SHIPPED','DELIVERED','CANCELLED')
)
```

**Suggested fix:** Use the enum type:

```typescript
@Column({ type: 'enum', enum: DispatchStatus, default: DispatchStatus.PLANNING })
status: DispatchStatus;
```

---

## HIGH FINDINGS

### 7. Missing `onDelete` on Foreign-Key Relations (5 relations)

Without `onDelete`, deleting a parent row will throw a foreign-key violation instead of cascading or nullifying.

| Entity File | Relation | Parent | Suggested `onDelete` | Line |
|-------------|----------|--------|----------------------|------|
| `user.entity.ts` | `role` | `Role` | `SET NULL` | 62 |
| `workflow-instance.entity.ts` | `currentState` | `WorkflowState` | `RESTRICT` or `SET NULL` | 32 |
| `workflow-transition.entity.ts` | `fromState` | `WorkflowState` | `CASCADE` | 11 |
| `workflow-transition.entity.ts` | `toState` | `WorkflowState` | `CASCADE` | 19 |
| `role-permission.entity.ts` | `role` / `permission` | `Role` / `Permission` | `CASCADE` | 12 / 20 |

**Suggested fix:**

```typescript
// user.entity.ts
@ManyToOne(() => Role, (role) => role.users, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'role_id' })
role: Role | null;

// workflow-transition.entity.ts
@ManyToOne(() => WorkflowState, (s) => s.outgoingTransitions, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'from_state_id' })
fromState: WorkflowState;

@ManyToOne(() => WorkflowState, (s) => s.incomingTransitions, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'to_state_id' })
toState: WorkflowState;
```

---

### 8. Massive Index Drift (Entity indexes not created by migrations)

The migrations only create:
- `tenant_id + deleted_at` composite indexes for every table.
- A handful of unique indexes for core tables.

The entities declare **dozens of additional `@Index()` decorators** that are never created by any migration. This causes:
1. Missing query-performance indexes in production.
2. `schema:validate` (if it checked indexes) would fail.
3. `synchronize: true` would generate a huge diff.

**Notable missing indexes (entity declares, migration omits):**

| Entity | Missing Index | Entity Line |
|--------|---------------|-------------|
| `Project` | `projectNumber + deletedAt` | 42 |
| `Project` | `customerId + stage + deletedAt` | 43 |
| `Enquiry` | `enquiryNumber + deletedAt` | 23 |
| `Enquiry` | `customerId + status + deletedAt` | 24 |
| `Quotation` | `quotationNumber + deletedAt` | 16 |
| `Quotation` | `enquiryId + status + deletedAt` | 17 |
| `Invoice` | `invoiceNumber + deletedAt` | 7 |
| `Payment` | `invoiceId + deletedAt` | 7 |
| `CreditNote` | `creditNoteNumber + deletedAt` | 5 |
| `WorkflowState` | `stateCode + deletedAt` | 7 |
| `WorkflowState` | `workflowType + isInitial + deletedAt` | 6 |
| `WorkflowTransition` | `fromStateId + deletedAt` | 6 |
| `WorkflowInstance` | `entityType + entityId + deletedAt` | 16 |
| `ActivityLog` | `entityType + entityId + createdAt` | 5 |
| `ActivityLog` | `userId + createdAt` | 6 |
| `Attachment` | `entityType + entityId + deletedAt` | 5 |
| `Comment` | `entityType + entityId + deletedAt` | 5 |
| `CustomField` | `entityType + fieldKey + deletedAt` | 7 |
| `CustomFieldValue` | `fieldId + entityId + deletedAt` | 5 |
| `CustomFieldValue` | `entityType + entityId + deletedAt` | 6 |
| `Note` | `entityType + entityId + deletedAt` | 5 |
| `CPSReview` | `reviewNumber + deletedAt` | 7 |
| `CPSReview` | `projectId + status + deletedAt` | 8 |
| `CustomerApproval` | `approvalNumber + deletedAt` | 8 |
| `CustomerApproval` | `projectId + result + deletedAt` | 9 |
| `DesignApproval` | `partId + revisionId + deletedAt` | 7 |
| `DesignBom` | `parentPartId + deletedAt` | 5 |
| `DesignFile` | `partId + revisionId + deletedAt` | 8 |
| `DesignPart` | `partNumber + deletedAt` | 7 |
| `DesignPart` | `projectId + deletedAt` | 8 |
| `DesignRevision` | `partId + revisionCode + deletedAt` | 7 |
| `DocumentVersion` | `documentNumber + versionNumber + deletedAt` | 8 |
| `DocumentVersion` | `entityType + entityId + deletedAt` | 9 |
| `DocumentDownload` | `documentId + downloadedAt` | 5 |
| `MachineBooking` | `machineId + startDatetime + deletedAt` | 7 |
| `MachineBooking` | `projectId + status + deletedAt` | 8 |
| `MachineCalendar` | `machineId + calendarDate + deletedAt` | 5 |
| `MachineMaster` | `machineNumber + deletedAt` | 7 |
| `JobCard` | `jobCardNumber + deletedAt` | 7 |
| `JobCard` | `workOrderId + deletedAt` | 8 |
| `MaterialIssue` | `issueNumber + deletedAt` | 5 |
| `MaterialIssue` | `workOrderId + deletedAt` | 6 |
| `ProductionBatch` | `batchNumber + deletedAt` | 5 |
| `WorkOrder` | `woNumber + deletedAt` | 8 |
| `WorkOrder` | `projectId + status + deletedAt` | 9 |
| `MoldSpecification` | `moldId + specCategory + deletedAt` | 5 |
| `MoldComponent` | `moldId + componentCode + deletedAt` | 5 |
| `MoldStructure` | `moldNumber + deletedAt` | 7 |
| `MoldStructure` | `projectId + deletedAt` | 8 |
| `ProcessPlan` | `planNumber + deletedAt` | 7 |
| `ProcessPlan` | `projectId + status + deletedAt` | 8 |
| `ProcessRouting` | `planId + deletedAt` | 5 |
| `ProcessStep` | `routingId + deletedAt` | 5 |
| `ResourceAllocation` | `projectId + status + deletedAt` | 8 |
| `ResourceAllocation` | `resourceId + startDate + deletedAt` | 9 |
| `ProjectBudget` | `projectId + deletedAt` | 5 |
| `ProjectMilestone` | `projectId + deletedAt` | 7 |
| `ProjectResource` | `projectId + userId + deletedAt` | 7 |
| `CapaVerification` | `capaNumber + deletedAt` | 8 |
| `CapaVerification` | `projectId + status + deletedAt` | 9 |
| `InspectionReport` | `reportNumber + deletedAt` | 7 |
| `InspectionReport` | `projectId + inspectionType + deletedAt` | 8 |
| `TrialObservation` | `trialNumber + deletedAt` | 8 |
| `TrialObservation` | `projectId + trialType + deletedAt` | 9 |
| `TrialMeasurement` | `trialId + deletedAt` | 5 |
| `Retrial` | `projectId + deletedAt` | 5 |
| `RetrialResult` | `retrialId + deletedAt` | 5 |
| `ServiceReport` | `reportNumber + deletedAt` | 5 |
| `ServiceReport` | `serviceRequestId + deletedAt` | 6 |
| `ServiceRequest` | `srNumber + deletedAt` | 9 |
| `ServiceRequest` | `moldId + status + deletedAt` | 10 |
| `ServiceSchedule` | `serviceRequestId + deletedAt` | 5 |
| `SparePart` | `partCode + deletedAt` | 5 |
| `SearchIndex` | `entityType + entityId + deletedAt` | 5 |
| `KnowledgeArticle` | `slug + deletedAt` | 8 |
| `KnowledgeArticle` | `categoryId + status + deletedAt` | 9 |
| `KnowledgeAttachment` | `articleId + deletedAt` | 5 |
| `KnowledgeCategory` | `slug + deletedAt` | 5 |
| `KnowledgeTag` | `slug + deletedAt` | 5 |
| `FolderScanJob` | `projectId + status + deletedAt` | 7 |
| `FolderScanResult` | `scanJobId + deletedAt` | 5 |
| `FolderScanResult` | `detectedFileType + deletedAt` | 6 |
| `FileRelationship` | `sourceFileId + deletedAt` | 5 |
| `EcoImplementation` | `ecoId + deletedAt` | 5 |
| `EcrAffectedPart` | `ecrId + deletedAt` | 5 |
| `CustomerApprovalHistory` | `approvalId + createdAt` | 5 |
| `CustomerApprovalFile` | `approvalId + deletedAt` | 5 |
| `CPSReviewItem` | `reviewId + deletedAt` | 7 |
| `CPSRequirement` | `checklistId + deletedAt` | 5 |
| `CPSApproval` | `reviewId + deletedAt` | 7 |
| `QuotationItem` | `quotationId + deletedAt` | 5 |

**Suggested fix:** Add a migration that creates all missing indexes, or add them to the `FullDomainSchema` migration. Example:

```sql
CREATE INDEX IF NOT EXISTS "IDX_projects_number_del"
  ON "projects" ("project_number", "deleted_at");
CREATE INDEX IF NOT EXISTS "IDX_projects_cust_stage_del"
  ON "projects" ("customer_id", "stage", "deleted_at");
-- ... repeat for all missing indexes
```

---

### 9. Schema-Validator Bug: `simple-json` Normalized to `text`

**File:** `database/scripts/validate-schema.ts` line 63

```typescript
'simple-json': 'text', // TypeORM default storage for simple-json is a JSON-stringified text column
```

Because the migrations use native `JSONB`, the validator will produce **false-positive type mismatches** for every `jsonb` column that the entity declares as `simple-json`. This undermines the purpose of the validator.

**Suggested fix:** Change the mapping to `'jsonb'` and update the exclusion logic so that `jsonb` ↔ `text` is still flagged as a real mismatch when the entity truly uses `simple-json` on a `jsonb` column.

```typescript
'simple-json': 'jsonb',  // MITRA uses native JSONB for all JSON columns
```

---

### 10. Inconsistent Primary-Key Type: `MachineStatus`

**File:** `modules/machine-status/entities/machine-status.entity.ts` lines 9–10

```typescript
@Entity('machine_status')
export class MachineStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'machine_id', type: 'varchar', length: 50, unique: true })
  machineId: string;
  ...
}
```

`machineId` is a `varchar(50)` business key, not a UUID. This is inconsistent with the rest of the schema (all other FKs use `UUID`). It also means the `machine_telemetry` table references `machine_id` as a string, not the UUID `id` of `machine_masters`. This creates a **dual-ID anti-pattern** and makes joins ambiguous.

**Suggested fix:** Either:
1. Change `machine_status` to use `machine_master.id` (UUID) as the FK, or
2. Document the business-key exception explicitly and add a `@Unique()` on `machine_masters.machine_number` to guarantee referential integrity.

---

## MEDIUM FINDINGS

### 11. Missing `@VersionColumn()` for Optimistic Locking

No entity in the entire codebase uses `@VersionColumn()`. This means concurrent updates to the same row (e.g., two users editing a project simultaneously) can silently overwrite each other.

**Suggested fix:** Add to `IndustrialBaseEntity`:

```typescript
@VersionColumn({ name: 'version', type: 'int', default: 0 })
version: number;
```

And add the corresponding `version INT NOT NULL DEFAULT 0` column in a new migration.

---

### 12. Missing `@Column({ comment: '...' })` Documentation

Zero columns have database comments. This hurts maintainability and makes auto-generated schema docs sparse.

**Suggested fix:** Add comments to key columns at least:

```typescript
@Column({ name: 'password_hash', type: 'varchar', length: 255, comment: 'Argon2id hash of the user password' })
@Exclude()
passwordHash: string;
```

---

### 13. Redundant `dotenv` Import & Logic in `seed.ts`

**File:** `database/seed.ts` lines 2, 186–194

```typescript
// Line 2
import * as dotenv from 'dotenv';
// ...
// Line 186
const _seedPass = process.env.SEED_ADMIN_PASSWORD;
if (!_seedPass) { ... process.exit(1); }
// Line 191
if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) { ... process.exit(1); }
```

Line 191 is unreachable because line 187 already exits. Also, `dotenv` is imported twice (line 2 and line 297).

**Suggested fix:** Remove the redundant check and consolidate `dotenv` to a single import.

---

## LOW FINDINGS

### 14. Redundant Entity Glob in `data-source.ts`

**File:** `database/data-source.ts` lines 45–46

```typescript
entities: [
  join(__dirname, '../modules/**/*.entity{.ts,.js}'),
  join(__dirname, '../modules/audit/**/*.entity{.ts,.js}'),  // redundant
],
```

The `audit` glob is already covered by `modules/**/*.entity`. The redundancy is harmless but adds noise.

**Suggested fix:** Remove the second entry.

```typescript
entities: [
  join(__dirname, '../modules/**/*.entity{.ts,.js}'),
],
```

---

## Quick-Fix Migration Template

To resolve the CRITICAL and HIGH findings in one shot, create `database/migrations/1700000000004-SchemaFixes.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaFixes1700000000004 implements MigrationInterface {
  name = 'SchemaFixes1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Missing tables
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

    // ... repeat for ai_usage_records, machine_status, machine_telemetry, bom_analyses, bom_items

    // 2. Missing audit_logs column
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "event_type" VARCHAR(20) NOT NULL DEFAULT 'CRUD'`);

    // 3. Missing indexes (subset of the most important)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_number_del" ON "projects" ("project_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_projects_cust_stage_del" ON "projects" ("customer_id", "stage", "deleted_at")`);
    // ... add remaining missing indexes here

    // 4. Align lengths (only if you want to shrink migration to match entity)
    // OR align entity to match migration (recommended for entity↔migration consistency)
    // ALTER TABLE "tenants" ALTER COLUMN "name" TYPE VARCHAR(100); -- if entity is source of truth
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "drawing_analyses"`);
    // ... drop other new tables
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "event_type"`);
  }
}
```

---

## Summary of Action Items

1. **Create missing tables** for `drawing_analyses`, `ai_usage_records`, `machine_status`, `machine_telemetry`, `bom_analyses`, `bom_items`.
2. **Add `event_type` column** to `audit_logs`.
3. **Replace `simple-json` with `jsonb`** in all 18 affected entity columns.
4. **Add missing `@Unique()` decorators** to `Tenant`, `User`, `Permission`, `RolePermission`, `Project`, `WorkflowInstance`.
5. **Fix `varchar` length mismatches** (7 fields) — align entity to migration or vice versa.
6. **Fix `DispatchPlan.status`** to use `type: 'enum'` instead of plain `varchar`.
7. **Add `onDelete`** to `User.role`, `WorkflowTransition` relations, and `RolePermission` relations.
8. **Add missing indexes** from the entity `@Index()` decorators into a migration.
9. **Fix `validate-schema.ts`** to map `simple-json` → `jsonb` and remove false positives.
10. **Add `@VersionColumn()`** to `IndustrialBaseEntity` for optimistic locking.
11. **Clean up `seed.ts`** redundant `dotenv` import and unreachable `if` block.
12. **Document `MachineStatus.machineId`** business-key decision or refactor to UUID FK.

---

*End of report.*
