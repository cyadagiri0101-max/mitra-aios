import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MITRA v2 — Migration 003: Full Domain Schema
 *
 * Creates 78 domain tables not covered by Migrations 001–002.
 *
 * Migration 001: tenants, users, roles, permissions, projects,
 *                workflow_states, workflow_transitions, workflow_instances, audit_logs.
 * Migration 002: knowledge_embeddings, ai_conversations, ai_messages,
 *                users.refresh_token_hash.
 * Migration 003: all remaining business-domain tables (this file).
 *
 * Safety guarantees:
 *   - All CREATE TABLE use IF NOT EXISTS — idempotent, safe to re-run.
 *   - All DROP TABLE in down() use IF EXISTS.
 *   - No destructive changes to tables created by prior migrations.
 *   - Enums stored as VARCHAR(50) + CHECK constraint — portable, easy to extend.
 */
export class FullDomainSchema1700000000002 implements MigrationInterface {
  name = 'FullDomainSchema1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() enabled in Migration 001.

    // ── activity_logs ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "user_id" UUID,
      "user_name" VARCHAR(100),
      "action" VARCHAR(50) NOT NULL,
      "description" VARCHAR(200),
      "ip_address" VARCHAR(50),
      "changes" JSONB,
      "metadata" JSONB,
      CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
      )
    `);

    // ── attachments ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attachments" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "original_name" VARCHAR(255) NOT NULL,
      "mime_type" VARCHAR(100),
      "file_size_bytes" BIGINT,
      "minio_bucket" VARCHAR(100) NOT NULL,
      "minio_key" VARCHAR(500) NOT NULL,
      "is_public" BOOLEAN NOT NULL DEFAULT false,
      "uploaded_by" UUID,
      "description" TEXT,
      CONSTRAINT "PK_attachments" PRIMARY KEY ("id")
      )
    `);

    // ── comments ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comments" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "content" TEXT NOT NULL,
      "parent_comment_id" UUID,
      "is_edited" BOOLEAN NOT NULL DEFAULT false,
      "edited_at" TIMESTAMPTZ,
      "is_resolved" BOOLEAN NOT NULL DEFAULT false,
      "resolved_by" UUID,
      "mentioned_users" JSONB,
      CONSTRAINT "PK_comments" PRIMARY KEY ("id")
      )
    `);

    // ── custom_fields ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_fields" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "field_key" VARCHAR(50) NOT NULL,
      "field_label" VARCHAR(100) NOT NULL,
      "field_type" VARCHAR(50) CHECK ("field_type" IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'URL') OR "field_type" IS NULL) NOT NULL DEFAULT 'TEXT',
      "is_required" BOOLEAN NOT NULL DEFAULT false,
      "is_searchable" BOOLEAN NOT NULL DEFAULT false,
      "show_in_list" BOOLEAN NOT NULL DEFAULT false,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "default_value" VARCHAR(255),
      "select_options" JSONB,
      "validation_regex" VARCHAR(255),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_custom_fields" PRIMARY KEY ("id")
      )
    `);

    // ── custom_field_values ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_field_values" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "field_id" UUID NOT NULL,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "string_value" TEXT,
      "number_value" NUMERIC(18,4),
      "date_value" DATE,
      "boolean_value" BOOLEAN,
      "json_value" JSONB,
      CONSTRAINT "PK_custom_field_values" PRIMARY KEY ("id")
      )
    `);

    // ── notes ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notes" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "title" VARCHAR(300),
      "content" TEXT NOT NULL,
      "note_type" VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
      "is_pinned" BOOLEAN NOT NULL DEFAULT false,
      "is_internal" BOOLEAN NOT NULL DEFAULT true,
      "visibility_roles" JSONB,
      "mentioned_users" JSONB,
      CONSTRAINT "PK_notes" PRIMARY KEY ("id")
      )
    `);

    // ── credit_notes ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credit_notes" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "credit_note_number" VARCHAR(30) NOT NULL UNIQUE,
      "invoice_id" UUID,
      "customer_id" UUID,
      "credit_date" DATE NOT NULL,
      "amount" NUMERIC(18,2) NOT NULL,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "reason" TEXT NOT NULL,
      "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      "notes" TEXT,
      CONSTRAINT "PK_credit_notes" PRIMARY KEY ("id")
      )
    `);

    // ── enquiries ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enquiries" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "enquiry_number" VARCHAR(30) NOT NULL UNIQUE,
      "customer_id" UUID,
      "customer_name" VARCHAR(200) NOT NULL,
      "customer_contact" VARCHAR(100),
      "customer_email" VARCHAR(200),
      "customer_phone" VARCHAR(30),
      "product_name" VARCHAR(200) NOT NULL,
      "product_description" TEXT,
      "mold_type" VARCHAR(50),
      "cavitation" INTEGER NOT NULL DEFAULT 1,
      "annual_volume" INTEGER,
      "material_type" VARCHAR(100),
      "part_weight_grams" NUMERIC(10,3),
      "target_price" NUMERIC(18,2),
      "target_delivery_weeks" INTEGER,
      "enquiry_date" DATE NOT NULL,
      "rfq_reference" VARCHAR(50),
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CONVERTED', 'LOST', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "source" VARCHAR(50) CHECK ("source" IN ('EMAIL', 'PHONE', 'WALK_IN', 'REFERRAL', 'WEBSITE', 'EXHIBITION') OR "source" IS NULL) NOT NULL DEFAULT 'EMAIL',
      "assigned_to" UUID,
      "follow_up_date" DATE,
      "remarks" TEXT,
      "lost_reason" TEXT,
      CONSTRAINT "PK_enquiries" PRIMARY KEY ("id")
      )
    `);

    // ── invoices ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "invoice_number" VARCHAR(30) NOT NULL UNIQUE,
      "quotation_id" UUID,
      "project_id" UUID,
      "customer_id" UUID,
      "customer_name" VARCHAR(200) NOT NULL,
      "invoice_date" DATE NOT NULL,
      "due_date" DATE,
      "subtotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "tax_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "total_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "paid_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "balance_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "payment_terms" TEXT,
      "notes" TEXT,
      CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
      )
    `);

    // ── payments ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "payment_number" VARCHAR(30) NOT NULL UNIQUE,
      "invoice_id" UUID,
      "customer_id" UUID,
      "payment_date" DATE NOT NULL,
      "amount" NUMERIC(18,2) NOT NULL,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "method" VARCHAR(50) CHECK ("method" IN ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI', 'NEFT', 'RTGS') OR "method" IS NULL) NOT NULL DEFAULT 'BANK_TRANSFER',
      "reference_number" VARCHAR(100),
      "bank_name" VARCHAR(100),
      "remarks" TEXT,
      "is_verified" BOOLEAN NOT NULL DEFAULT false,
      "verified_by" UUID,
      CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )
    `);

    // ── quotations ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quotations" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "quotation_number" VARCHAR(30) NOT NULL UNIQUE,
      "enquiry_id" UUID,
      "revision_number" INTEGER NOT NULL DEFAULT 1,
      "quotation_date" DATE NOT NULL,
      "valid_until" DATE,
      "customer_id" UUID,
      "customer_name" VARCHAR(200) NOT NULL,
      "subtotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "discount_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
      "discount_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "tax_pct" NUMERIC(5,2) NOT NULL DEFAULT 18,
      "tax_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "total_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "delivery_weeks" INTEGER,
      "payment_terms" TEXT,
      "warranty_months" INTEGER NOT NULL DEFAULT 12,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISED', 'WON', 'LOST') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "rejection_reason" TEXT,
      "terms_and_conditions" TEXT,
      "notes" TEXT,
      CONSTRAINT "PK_quotations" PRIMARY KEY ("id")
      )
    `);

    // ── quotation_items ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quotation_items" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "quotation_id" UUID NOT NULL,
      "line_number" INTEGER NOT NULL,
      "item_code" VARCHAR(50),
      "description" TEXT NOT NULL,
      "item_category" VARCHAR(50),
      "quantity" NUMERIC(10,3) NOT NULL DEFAULT 1,
      "unit" VARCHAR(20) NOT NULL DEFAULT 'NOS',
      "unit_price" NUMERIC(18,2) NOT NULL,
      "discount_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
      "line_total" NUMERIC(18,2) NOT NULL,
      "lead_time_weeks" INTEGER,
      "hsn_code" VARCHAR(20),
      "remarks" TEXT,
      CONSTRAINT "PK_quotation_items" PRIMARY KEY ("id")
      )
    `);

    // ── cps_approvals ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cps_approvals" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "review_id" UUID NOT NULL,
      "approver_id" UUID NOT NULL,
      "approver_name" VARCHAR(100) NOT NULL,
      "approver_role" VARCHAR(50) NOT NULL,
      "approval_sequence" INTEGER NOT NULL DEFAULT 1,
      "result" VARCHAR(50) CHECK ("result" IN ('APPROVED', 'REJECTED', 'CONDITIONAL', 'PENDING') OR "result" IS NULL) NOT NULL DEFAULT 'PENDING',
      "approved_at" TIMESTAMPTZ,
      "comments" TEXT,
      "conditions" TEXT,
      "is_required" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_cps_approvals" PRIMARY KEY ("id")
      )
    `);

    // ── cps_checklists ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cps_checklists" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "checklist_code" VARCHAR(30) NOT NULL UNIQUE,
      "checklist_name" VARCHAR(200) NOT NULL,
      "mold_type" VARCHAR(50),
      "version" VARCHAR(10) NOT NULL DEFAULT '1.0',
      "effective_date" DATE,
      "is_default" BOOLEAN NOT NULL DEFAULT false,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "total_items" INTEGER NOT NULL DEFAULT 0,
      "categories" JSONB,
      "description" TEXT,
      CONSTRAINT "PK_cps_checklists" PRIMARY KEY ("id")
      )
    `);

    // ── cps_requirements ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cps_requirements" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "checklist_id" UUID NOT NULL,
      "item_code" VARCHAR(20) NOT NULL,
      "category" VARCHAR(50) NOT NULL,
      "item_description" TEXT NOT NULL,
      "acceptance_criteria" TEXT,
      "reference_standard" VARCHAR(100),
      "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "applies_to_mold_types" JSONB,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_cps_requirements" PRIMARY KEY ("id")
      )
    `);

    // ── cps_reviews ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cps_reviews" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "review_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID NOT NULL,
      "review_version" INTEGER NOT NULL DEFAULT 1,
      "review_date" DATE NOT NULL,
      "design_stage" VARCHAR(50),
      "product_name" VARCHAR(200) NOT NULL,
      "part_number" VARCHAR(50),
      "customer_name" VARCHAR(200),
      "mold_type" VARCHAR(50),
      "cavitation" INTEGER NOT NULL DEFAULT 1,
      "material_type" VARCHAR(100),
      "total_items" INTEGER NOT NULL DEFAULT 0,
      "passed_items" INTEGER NOT NULL DEFAULT 0,
      "failed_items" INTEGER NOT NULL DEFAULT 0,
      "na_items" INTEGER NOT NULL DEFAULT 0,
      "conducted_by" UUID,
      "reviewed_by" UUID,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "rejection_reason" TEXT,
      "overall_comments" TEXT,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVISED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      CONSTRAINT "PK_cps_reviews" PRIMARY KEY ("id")
      )
    `);

    // ── cps_review_items ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cps_review_items" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "review_id" UUID NOT NULL,
      "checklist_item_id" UUID,
      "category" VARCHAR(50) NOT NULL,
      "item_code" VARCHAR(20) NOT NULL,
      "item_description" TEXT NOT NULL,
      "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
      "compliance_status" VARCHAR(50) CHECK ("compliance_status" IN ('PASS', 'FAIL', 'NA', 'PENDING') OR "compliance_status" IS NULL) NOT NULL DEFAULT 'PENDING',
      "actual_value" VARCHAR(200),
      "expected_value" VARCHAR(200),
      "remarks" TEXT,
      "evidence_file_id" UUID,
      "reviewed_by" UUID,
      "reviewed_at" TIMESTAMPTZ,
      CONSTRAINT "PK_cps_review_items" PRIMARY KEY ("id")
      )
    `);

    // ── customer_approvals ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_approvals" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "approval_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID NOT NULL,
      "trial_id" UUID,
      "approval_type" VARCHAR(50) CHECK ("approval_type" IN ('DESIGN', 'SAMPLE', 'TRIAL', 'FINAL', 'PPAP') OR "approval_type" IS NULL) NOT NULL DEFAULT 'TRIAL',
      "approval_date" DATE,
      "customer_id" UUID,
      "customer_name" VARCHAR(200) NOT NULL,
      "customer_contact" VARCHAR(100),
      "customer_designation" VARCHAR(100),
      "approved_samples" INTEGER,
      "rejected_samples" INTEGER,
      "approval_conditions" TEXT,
      "pending_actions" JSONB,
      "next_review_date" DATE,
      "result" VARCHAR(50) CHECK ("result" IN ('APPROVED', 'REJECTED', 'CONDITIONAL', 'PENDING') OR "result" IS NULL) NOT NULL DEFAULT 'PENDING',
      "internal_notes" TEXT,
      "customer_feedback" TEXT,
      "signed_off_at" TIMESTAMPTZ,
      CONSTRAINT "PK_customer_approvals" PRIMARY KEY ("id")
      )
    `);

    // ── customer_approval_files ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_approval_files" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "approval_id" UUID NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "original_name" VARCHAR(255) NOT NULL,
      "file_type" VARCHAR(50),
      "minio_bucket" VARCHAR(100) NOT NULL,
      "minio_key" VARCHAR(500) NOT NULL,
      "file_size_bytes" BIGINT,
      "is_customer_provided" BOOLEAN NOT NULL DEFAULT false,
      "description" TEXT,
      "uploaded_by" UUID,
      CONSTRAINT "PK_customer_approval_files" PRIMARY KEY ("id")
      )
    `);

    // ── customer_approval_history ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_approval_history" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "approval_id" UUID NOT NULL,
      "action" VARCHAR(50) NOT NULL,
      "from_status" VARCHAR(30),
      "to_status" VARCHAR(30),
      "performed_by" UUID,
      "performed_by_name" VARCHAR(100),
      "performed_at" TIMESTAMPTZ NOT NULL,
      "comments" TEXT,
      "metadata" JSONB,
      CONSTRAINT "PK_customer_approval_history" PRIMARY KEY ("id")
      )
    `);

    // ── design_approvals ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_approvals" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "part_id" UUID NOT NULL,
      "revision_id" UUID,
      "approval_stage" VARCHAR(50) NOT NULL,
      "approver_id" UUID,
      "approver_name" VARCHAR(100),
      "approver_role" VARCHAR(50),
      "result" VARCHAR(50) CHECK ("result" IN ('APPROVED', 'REJECTED', 'CONDITIONAL', 'PENDING') OR "result" IS NULL) NOT NULL DEFAULT 'PENDING',
      "approved_at" TIMESTAMPTZ,
      "comments" TEXT,
      "conditions" TEXT,
      CONSTRAINT "PK_design_approvals" PRIMARY KEY ("id")
      )
    `);

    // ── design_boms ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_boms" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID,
      "parent_part_id" UUID NOT NULL,
      "child_part_id" UUID NOT NULL,
      "level" INTEGER NOT NULL DEFAULT 1,
      "sequence" INTEGER NOT NULL DEFAULT 1,
      "quantity" NUMERIC(10,3) NOT NULL DEFAULT 1,
      "unit" VARCHAR(20) NOT NULL DEFAULT 'NOS',
      "find_number" VARCHAR(20),
      "reference_designator" VARCHAR(100),
      "is_phantom" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      CONSTRAINT "PK_design_boms" PRIMARY KEY ("id")
      )
    `);

    // ── design_files ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_files" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "part_id" UUID NOT NULL,
      "revision_id" UUID,
      "file_name" VARCHAR(255) NOT NULL,
      "original_name" VARCHAR(255) NOT NULL,
      "file_type" VARCHAR(50) CHECK ("file_type" IN ('STEP', 'IGES', 'DXF', 'DWG', 'PDF', 'CAM', 'EDM', 'PHOTO', 'VIDEO', 'OTHER') OR "file_type" IS NULL) NOT NULL DEFAULT 'STEP',
      "minio_bucket" VARCHAR(100) NOT NULL,
      "minio_key" VARCHAR(500) NOT NULL,
      "file_size_bytes" BIGINT,
      "checksum_sha256" VARCHAR(64),
      "version_number" INTEGER NOT NULL DEFAULT 1,
      "is_latest" BOOLEAN NOT NULL DEFAULT true,
      "checkout_status" VARCHAR(50) CHECK ("checkout_status" IN ('AVAILABLE', 'CHECKED_OUT', 'LOCKED') OR "checkout_status" IS NULL) NOT NULL DEFAULT 'AVAILABLE',
      "checked_out_by" UUID,
      "checked_out_at" TIMESTAMPTZ,
      "uploaded_by" UUID,
      "description" TEXT,
      CONSTRAINT "PK_design_files" PRIMARY KEY ("id")
      )
    `);

    // ── design_parts ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_parts" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "part_number" VARCHAR(50) NOT NULL,
      "part_name" VARCHAR(200) NOT NULL,
      "project_id" UUID,
      "current_revision" VARCHAR(10) NOT NULL DEFAULT 'A',
      "part_category" VARCHAR(50),
      "material_grade" VARCHAR(50),
      "heat_treatment" VARCHAR(100),
      "surface_finish" VARCHAR(100),
      "weight_kg" NUMERIC(10,3),
      "dim_length_mm" NUMERIC(10,2),
      "dim_width_mm" NUMERIC(10,2),
      "dim_height_mm" NUMERIC(10,2),
      "designed_by" UUID,
      "design_start_date" DATE,
      "design_release_date" DATE,
      "status" VARCHAR(50) CHECK ("status" IN ('ACTIVE', 'OBSOLETE', 'IN_REVISION', 'RELEASED') OR "status" IS NULL) NOT NULL DEFAULT 'ACTIVE',
      "notes" TEXT,
      CONSTRAINT "PK_design_parts" PRIMARY KEY ("id")
      )
    `);

    // ── design_revisions ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_revisions" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "part_id" UUID NOT NULL,
      "revision_code" VARCHAR(10) NOT NULL,
      "revision_number" INTEGER NOT NULL DEFAULT 1,
      "change_description" TEXT NOT NULL,
      "change_reason" VARCHAR(50),
      "ecr_number" VARCHAR(30),
      "revision_date" DATE NOT NULL,
      "revised_by" UUID,
      "reviewed_by" UUID,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED', 'SUPERSEDED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "notes" TEXT,
      CONSTRAINT "PK_design_revisions" PRIMARY KEY ("id")
      )
    `);

    // ── design_standards ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "design_standards" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "standard_code" VARCHAR(50) NOT NULL,
      "standard_name" VARCHAR(200) NOT NULL,
      "issuing_body" VARCHAR(100),
      "version" VARCHAR(20),
      "effective_date" DATE,
      "expiry_date" DATE,
      "applies_to" TEXT,
      "description" TEXT,
      "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
      "document_path" VARCHAR(500),
      CONSTRAINT "PK_design_standards" PRIMARY KEY ("id")
      )
    `);

    // ── document_downloads ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_downloads" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "document_id" UUID NOT NULL,
      "downloaded_by" UUID,
      "downloaded_at" TIMESTAMPTZ NOT NULL,
      "ip_address" VARCHAR(50),
      "user_agent" TEXT,
      "download_reason" VARCHAR(100),
      CONSTRAINT "PK_document_downloads" PRIMARY KEY ("id")
      )
    `);

    // ── document_versions ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_versions" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "document_number" VARCHAR(50) NOT NULL,
      "title" VARCHAR(300) NOT NULL,
      "version_number" VARCHAR(10) NOT NULL DEFAULT '1.0',
      "version_int" INTEGER NOT NULL DEFAULT 1,
      "entity_type" VARCHAR(50),
      "entity_id" UUID,
      "file_name" VARCHAR(255) NOT NULL,
      "original_name" VARCHAR(255) NOT NULL,
      "file_extension" VARCHAR(20),
      "mime_type" VARCHAR(100),
      "file_size_bytes" BIGINT,
      "minio_bucket" VARCHAR(100) NOT NULL,
      "minio_key" VARCHAR(500) NOT NULL,
      "checksum_sha256" VARCHAR(64),
      "category" VARCHAR(50) CHECK ("category" IN ('DESIGN', 'MANUFACTURING', 'QUALITY', 'COMMERCIAL', 'GENERAL') OR "category" IS NULL) NOT NULL DEFAULT 'GENERAL',
      "is_latest" BOOLEAN NOT NULL DEFAULT true,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'RELEASED', 'OBSOLETE', 'ARCHIVED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "expiry_date" DATE,
      "change_summary" TEXT,
      "access_roles" JSONB,
      "tags" JSONB,
      "uploaded_by" UUID,
      CONSTRAINT "PK_document_versions" PRIMARY KEY ("id")
      )
    `);

    // ── eco_implementations ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eco_implementations" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "eco_id" UUID NOT NULL,
      "task_description" TEXT NOT NULL,
      "task_type" VARCHAR(50) NOT NULL,
      "assigned_to" UUID,
      "due_date" DATE,
      "completed_at" TIMESTAMPTZ,
      "verification_required" BOOLEAN NOT NULL DEFAULT false,
      "verification_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      "verified_by" UUID,
      "evidence_notes" TEXT,
      "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      CONSTRAINT "PK_eco_implementations" PRIMARY KEY ("id")
      )
    `);

    // ── ecr_affected_parts ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ecr_affected_parts" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "ecr_id" UUID NOT NULL,
      "part_id" UUID,
      "part_number" VARCHAR(50) NOT NULL,
      "part_name" VARCHAR(200) NOT NULL,
      "current_revision" VARCHAR(10),
      "new_revision" VARCHAR(10),
      "change_description" TEXT NOT NULL,
      "disposition" VARCHAR(50),
      "effective_date" DATE,
      "is_critical" BOOLEAN NOT NULL DEFAULT false,
      "remarks" TEXT,
      CONSTRAINT "PK_ecr_affected_parts" PRIMARY KEY ("id")
      )
    `);

    // ── engineering_change_orders ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_change_orders" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "eco_number" VARCHAR(30) NOT NULL UNIQUE,
      "ecr_id" UUID NOT NULL,
      "implementation_plan" TEXT NOT NULL,
      "implementation_start_date" DATE,
      "implementation_end_date" DATE,
      "actual_completion_date" DATE,
      "responsible_person_id" UUID,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "verification_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      "verified_by" UUID,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'APPROVED', 'IN_IMPLEMENTATION', 'COMPLETED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "notes" TEXT,
      CONSTRAINT "PK_engineering_change_orders" PRIMARY KEY ("id")
      )
    `);

    // ── engineering_change_requests ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engineering_change_requests" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "ecr_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "part_id" UUID,
      "title" VARCHAR(300) NOT NULL,
      "change_description" TEXT NOT NULL,
      "change_reason" TEXT NOT NULL,
      "change_type" VARCHAR(50) CHECK ("change_type" IN ('DESIGN', 'PROCESS', 'MATERIAL', 'SUPPLIER', 'SPECIFICATION', 'TOOLING') OR "change_type" IS NULL) NOT NULL DEFAULT 'DESIGN',
      "priority" VARCHAR(50) CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') OR "priority" IS NULL) NOT NULL DEFAULT 'MEDIUM',
      "impact_assessment" TEXT,
      "cost_impact" NUMERIC(18,2),
      "schedule_impact_days" INTEGER,
      "requested_by" UUID,
      "requested_date" DATE NOT NULL,
      "required_by_date" DATE,
      "reviewed_by" UUID,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "rejection_reason" TEXT,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CLOSED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      CONSTRAINT "PK_engineering_change_requests" PRIMARY KEY ("id")
      )
    `);

    // ── file_classification_rules ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "file_classification_rules" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "rule_name" VARCHAR(100) NOT NULL,
      "match_type" VARCHAR(50) CHECK ("match_type" IN ('EXTENSION', 'FILENAME_PATTERN', 'CONTENT_SIGNATURE', 'FOLDER_PATH') OR "match_type" IS NULL) NOT NULL DEFAULT 'EXTENSION',
      "match_pattern" VARCHAR(255) NOT NULL,
      "detected_type" VARCHAR(50) NOT NULL,
      "target_folder_type" VARCHAR(50),
      "priority" INTEGER NOT NULL DEFAULT 5,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "description" TEXT,
      CONSTRAINT "PK_file_classification_rules" PRIMARY KEY ("id")
      )
    `);

    // ── file_relationships ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "file_relationships" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "source_file_id" UUID NOT NULL,
      "target_file_id" UUID NOT NULL,
      "relationship_type" VARCHAR(50) NOT NULL,
      "source_entity_type" VARCHAR(50),
      "detected_automatically" BOOLEAN NOT NULL DEFAULT false,
      "confidence_score" NUMERIC(5,2),
      "notes" TEXT,
      CONSTRAINT "PK_file_relationships" PRIMARY KEY ("id")
      )
    `);

    // ── folder_scan_jobs ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "folder_scan_jobs" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID,
      "job_name" VARCHAR(100) NOT NULL,
      "root_path" VARCHAR(500) NOT NULL,
      "scan_type" VARCHAR(30) NOT NULL DEFAULT 'CLASSIFY',
      "status" VARCHAR(50) CHECK ("status" IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'PENDING',
      "started_at" TIMESTAMPTZ,
      "completed_at" TIMESTAMPTZ,
      "total_files_scanned" INTEGER NOT NULL DEFAULT 0,
      "files_classified" INTEGER NOT NULL DEFAULT 0,
      "files_unclassified" INTEGER NOT NULL DEFAULT 0,
      "error_message" TEXT,
      "triggered_by" UUID,
      CONSTRAINT "PK_folder_scan_jobs" PRIMARY KEY ("id")
      )
    `);

    // ── folder_scan_results ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "folder_scan_results" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "scan_job_id" UUID NOT NULL,
      "file_path" VARCHAR(500) NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "file_extension" VARCHAR(20),
      "file_size_bytes" BIGINT,
      "file_modified_at" TIMESTAMPTZ,
      "detected_file_type" VARCHAR(50),
      "detection_method" VARCHAR(30),
      "confidence_score" NUMERIC(5,2),
      "matched_rule_id" UUID,
      "is_classified" BOOLEAN NOT NULL DEFAULT false,
      "needs_review" BOOLEAN NOT NULL DEFAULT false,
      "minio_imported" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "PK_folder_scan_results" PRIMARY KEY ("id")
      )
    `);

    // ── project_folders ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_folders" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID NOT NULL,
      "folder_path" VARCHAR(500) NOT NULL,
      "folder_name" VARCHAR(255) NOT NULL,
      "folder_type" VARCHAR(50) NOT NULL,
      "minio_prefix" VARCHAR(500),
      "file_count" INTEGER NOT NULL DEFAULT 0,
      "total_size_bytes" BIGINT NOT NULL DEFAULT 0,
      "last_scanned_at" TIMESTAMPTZ,
      "is_watched" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "PK_project_folders" PRIMARY KEY ("id")
      )
    `);

    // ── knowledge_articles ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_articles" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "title" VARCHAR(300) NOT NULL,
      "slug" VARCHAR(300) NOT NULL UNIQUE,
      "category_id" UUID,
      "article_type" VARCHAR(50) CHECK ("article_type" IN ('PROCEDURE', 'TROUBLESHOOTING', 'BEST_PRACTICE', 'STANDARD', 'LESSON_LEARNED', 'FAQ') OR "article_type" IS NULL) NOT NULL DEFAULT 'PROCEDURE',
      "content" TEXT NOT NULL,
      "summary" TEXT,
      "tags" JSONB,
      "related_modules" JSONB,
      "view_count" INTEGER NOT NULL DEFAULT 0,
      "helpful_count" INTEGER NOT NULL DEFAULT 0,
      "not_helpful_count" INTEGER NOT NULL DEFAULT 0,
      "author_id" UUID,
      "reviewed_by" UUID,
      "published_at" TIMESTAMPTZ,
      "last_reviewed_at" DATE,
      "review_due_date" DATE,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "access_roles" JSONB,
      "seo_keywords" JSONB,
      CONSTRAINT "PK_knowledge_articles" PRIMARY KEY ("id")
      )
    `);

    // ── knowledge_attachments ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_attachments" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "article_id" UUID NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "original_name" VARCHAR(255) NOT NULL,
      "mime_type" VARCHAR(100),
      "file_size_bytes" BIGINT,
      "minio_bucket" VARCHAR(100) NOT NULL,
      "minio_key" VARCHAR(500) NOT NULL,
      "display_order" INTEGER NOT NULL DEFAULT 0,
      "is_inline" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "PK_knowledge_attachments" PRIMARY KEY ("id")
      )
    `);

    // ── knowledge_categories ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_categories" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "name" VARCHAR(100) NOT NULL,
      "slug" VARCHAR(100) NOT NULL UNIQUE,
      "parent_id" UUID,
      "description" TEXT,
      "icon" VARCHAR(50),
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "article_count" INTEGER NOT NULL DEFAULT 0,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_knowledge_categories" PRIMARY KEY ("id")
      )
    `);

    // ── knowledge_tags ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_tags" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "name" VARCHAR(50) NOT NULL,
      "slug" VARCHAR(50) NOT NULL UNIQUE,
      "color" VARCHAR(7),
      "usage_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "PK_knowledge_tags" PRIMARY KEY ("id")
      )
    `);

    // ── machine_bookings ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "machine_bookings" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "booking_number" VARCHAR(30) NOT NULL UNIQUE,
      "machine_id" UUID NOT NULL,
      "project_id" UUID,
      "work_order_id" UUID,
      "start_datetime" TIMESTAMPTZ NOT NULL,
      "end_datetime" TIMESTAMPTZ NOT NULL,
      "booked_hours" NUMERIC(6,2),
      "shift" VARCHAR(20),
      "status" VARCHAR(50) CHECK ("status" IN ('REQUESTED', 'CONFIRMED', 'IN_USE', 'COMPLETED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'REQUESTED',
      "booked_by" UUID,
      "purpose" TEXT,
      "remarks" TEXT,
      CONSTRAINT "PK_machine_bookings" PRIMARY KEY ("id")
      )
    `);

    // ── machine_calendars ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "machine_calendars" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "machine_id" UUID NOT NULL,
      "calendar_date" DATE NOT NULL,
      "shift_1_available" BOOLEAN NOT NULL DEFAULT true,
      "shift_2_available" BOOLEAN NOT NULL DEFAULT false,
      "shift_3_available" BOOLEAN NOT NULL DEFAULT false,
      "available_hours" NUMERIC(5,2) NOT NULL DEFAULT 8,
      "is_holiday" BOOLEAN NOT NULL DEFAULT false,
      "holiday_description" VARCHAR(100),
      "planned_downtime_hours" NUMERIC(5,2) NOT NULL DEFAULT 0,
      "remarks" TEXT,
      CONSTRAINT "PK_machine_calendars" PRIMARY KEY ("id")
      )
    `);

    // ── machine_masters ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "machine_masters" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "machine_number" VARCHAR(30) NOT NULL UNIQUE,
      "machine_name" VARCHAR(200) NOT NULL,
      "machine_type_id" UUID,
      "manufacturer" VARCHAR(100),
      "model_number" VARCHAR(50),
      "serial_number" VARCHAR(50),
      "year_of_manufacture" INTEGER,
      "purchase_date" DATE,
      "capacity_description" VARCHAR(200),
      "max_table_size_mm" VARCHAR(50),
      "location" VARCHAR(50),
      "cost_per_hour" NUMERIC(10,2),
      "last_maintenance_date" DATE,
      "next_maintenance_date" DATE,
      "status" VARCHAR(50) CHECK ("status" IN ('ACTIVE', 'UNDER_MAINTENANCE', 'IDLE', 'DECOMMISSIONED') OR "status" IS NULL) NOT NULL DEFAULT 'ACTIVE',
      "remarks" TEXT,
      CONSTRAINT "PK_machine_masters" PRIMARY KEY ("id")
      )
    `);

    // ── machine_types ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "machine_types" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "type_code" VARCHAR(20) NOT NULL UNIQUE,
      "type_name" VARCHAR(100) NOT NULL,
      "category" VARCHAR(50),
      "description" TEXT,
      "standard_cost_per_hour" NUMERIC(10,2),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_machine_types" PRIMARY KEY ("id")
      )
    `);

    // ── job_cards ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_cards" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "job_card_number" VARCHAR(30) NOT NULL UNIQUE,
      "work_order_id" UUID NOT NULL,
      "operation_id" UUID,
      "machine_id" UUID,
      "operator_id" UUID,
      "planned_date" DATE,
      "planned_hours" NUMERIC(6,2),
      "actual_hours" NUMERIC(6,2),
      "qty_planned" NUMERIC(10,3) NOT NULL DEFAULT 1,
      "qty_completed" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "status" VARCHAR(50) CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'OPEN',
      "instructions" TEXT,
      "remarks" TEXT,
      CONSTRAINT "PK_job_cards" PRIMARY KEY ("id")
      )
    `);

    // ── material_issues ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_issues" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "issue_number" VARCHAR(30) NOT NULL UNIQUE,
      "work_order_id" UUID,
      "issued_to_id" UUID,
      "issued_by_id" UUID,
      "issue_date" DATE NOT NULL,
      "material_code" VARCHAR(50) NOT NULL,
      "material_description" VARCHAR(200) NOT NULL,
      "quantity" NUMERIC(10,3) NOT NULL,
      "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
      "batch_id" UUID,
      "store_location" VARCHAR(50),
      "remarks" TEXT,
      CONSTRAINT "PK_material_issues" PRIMARY KEY ("id")
      )
    `);

    // ── operations ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operations" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "operation_code" VARCHAR(20) NOT NULL UNIQUE,
      "operation_name" VARCHAR(200) NOT NULL,
      "operation_category" VARCHAR(50),
      "machine_type_id" UUID,
      "setup_time_minutes" INTEGER NOT NULL DEFAULT 0,
      "cycle_time_minutes" NUMERIC(8,2) NOT NULL DEFAULT 0,
      "standard_cost" NUMERIC(10,2),
      "skill_level" VARCHAR(20) NOT NULL DEFAULT 'BASIC',
      "is_outsourced" BOOLEAN NOT NULL DEFAULT false,
      "vendor_id" UUID,
      "description" TEXT,
      CONSTRAINT "PK_operations" PRIMARY KEY ("id")
      )
    `);

    // ── operation_logs ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operation_logs" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "work_order_id" UUID NOT NULL,
      "operator_id" UUID,
      "machine_id" UUID,
      "shift" VARCHAR(20),
      "log_date" DATE NOT NULL,
      "start_time" TIMESTAMPTZ,
      "end_time" TIMESTAMPTZ,
      "duration_minutes" NUMERIC(8,2),
      "qty_produced" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "qty_rejected" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "rejection_reason" TEXT,
      "machine_downtime_minutes" INTEGER NOT NULL DEFAULT 0,
      "downtime_reason" TEXT,
      "remarks" TEXT,
      CONSTRAINT "PK_operation_logs" PRIMARY KEY ("id")
      )
    `);

    // ── production_batches ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "production_batches" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "batch_number" VARCHAR(30) NOT NULL UNIQUE,
      "work_order_id" UUID,
      "material_id" UUID,
      "material_description" VARCHAR(200),
      "batch_qty" NUMERIC(10,3) NOT NULL,
      "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
      "production_date" DATE,
      "expiry_date" DATE,
      "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      "supplier_batch" VARCHAR(50),
      "inspection_result" VARCHAR(20),
      "remarks" TEXT,
      CONSTRAINT "PK_production_batches" PRIMARY KEY ("id")
      )
    `);

    // ── work_orders ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_orders" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "wo_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "part_id" UUID,
      "part_name" VARCHAR(200) NOT NULL,
      "operation_type" VARCHAR(100) NOT NULL,
      "planned_start_date" DATE,
      "planned_end_date" DATE,
      "actual_start_date" DATE,
      "actual_end_date" DATE,
      "planned_qty" NUMERIC(10,3) NOT NULL DEFAULT 1,
      "completed_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "rejected_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "machine_id" UUID,
      "operator_id" UUID,
      "supervisor_id" UUID,
      "estimated_hours" NUMERIC(8,2),
      "actual_hours" NUMERIC(8,2),
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "priority" VARCHAR(50) CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT') OR "priority" IS NULL) NOT NULL DEFAULT 'NORMAL',
      "drawing_revision" VARCHAR(10),
      "instructions" TEXT,
      "remarks" TEXT,
      CONSTRAINT "PK_work_orders" PRIMARY KEY ("id")
      )
    `);

    // ── component_materials ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "component_materials" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "material_code" VARCHAR(30) NOT NULL UNIQUE,
      "material_name" VARCHAR(200) NOT NULL,
      "material_standard" VARCHAR(50),
      "din_equivalent" VARCHAR(30),
      "aisi_equivalent" VARCHAR(30),
      "hardness_min_hrc" NUMERIC(5,1),
      "hardness_max_hrc" NUMERIC(5,1),
      "tensile_strength_mpa" INTEGER,
      "yield_strength_mpa" INTEGER,
      "cost_per_kg" NUMERIC(10,2),
      "preferred_supplier" VARCHAR(100),
      "typical_applications" JSONB,
      "heat_treatment_notes" TEXT,
      CONSTRAINT "PK_component_materials" PRIMARY KEY ("id")
      )
    `);

    // ── mold_assemblies ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mold_assemblies" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "mold_id" UUID NOT NULL,
      "assembly_name" VARCHAR(100) NOT NULL,
      "assembly_type" VARCHAR(50) NOT NULL,
      "parent_assembly_id" UUID,
      "sequence" INTEGER NOT NULL DEFAULT 1,
      "description" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_mold_assemblies" PRIMARY KEY ("id")
      )
    `);

    // ── mold_components ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mold_components" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "mold_id" UUID NOT NULL,
      "assembly_id" UUID,
      "component_code" VARCHAR(30) NOT NULL,
      "component_name" VARCHAR(200) NOT NULL,
      "component_type" VARCHAR(50),
      "material_grade" VARCHAR(50),
      "heat_treatment" VARCHAR(100),
      "hardness_hrc" NUMERIC(5,1),
      "surface_finish_ra" NUMERIC(5,2),
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "weight_kg" NUMERIC(8,3),
      "drawing_number" VARCHAR(50),
      "manufacture_type" VARCHAR(20) NOT NULL DEFAULT 'IN_HOUSE',
      "vendor_id" UUID,
      "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      "remarks" TEXT,
      CONSTRAINT "PK_mold_components" PRIMARY KEY ("id")
      )
    `);

    // ── mold_specifications ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mold_specifications" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "mold_id" UUID NOT NULL,
      "spec_category" VARCHAR(50) NOT NULL,
      "spec_name" VARCHAR(200) NOT NULL,
      "spec_value" VARCHAR(200) NOT NULL,
      "unit" VARCHAR(30),
      "nominal_value" NUMERIC(12,4),
      "upper_limit" NUMERIC(12,4),
      "lower_limit" NUMERIC(12,4),
      "is_critical" BOOLEAN NOT NULL DEFAULT false,
      "remarks" TEXT,
      CONSTRAINT "PK_mold_specifications" PRIMARY KEY ("id")
      )
    `);

    // ── mold_structures ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mold_structures" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "mold_number" VARCHAR(30) NOT NULL UNIQUE,
      "mold_name" VARCHAR(200) NOT NULL,
      "project_id" UUID,
      "mold_type" VARCHAR(50),
      "no_of_cavities" INTEGER NOT NULL DEFAULT 1,
      "no_of_cores" INTEGER NOT NULL DEFAULT 1,
      "mold_base_material" VARCHAR(100),
      "cavity_material" VARCHAR(100),
      "core_material" VARCHAR(100),
      "mold_length_mm" NUMERIC(10,2),
      "mold_width_mm" NUMERIC(10,2),
      "mold_height_mm" NUMERIC(10,2),
      "mold_weight_kg" NUMERIC(10,2),
      "runner_type" VARCHAR(50),
      "gate_type" VARCHAR(50),
      "ejection_system" VARCHAR(50),
      "cooling_system" VARCHAR(100),
      "design_life_shots" INTEGER,
      "current_shots" INTEGER NOT NULL DEFAULT 0,
      "status" VARCHAR(50) CHECK ("status" IN ('DESIGN', 'MANUFACTURING', 'TRIAL', 'APPROVED', 'IN_PRODUCTION', 'UNDER_MAINTENANCE', 'RETIRED') OR "status" IS NULL) NOT NULL DEFAULT 'DESIGN',
      "remarks" TEXT,
      CONSTRAINT "PK_mold_structures" PRIMARY KEY ("id")
      )
    `);

    // ── process_plans ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_plans" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "plan_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "part_id" UUID,
      "plan_version" INTEGER NOT NULL DEFAULT 1,
      "plan_date" DATE,
      "total_estimated_hours" NUMERIC(8,2),
      "total_estimated_cost" NUMERIC(18,2),
      "prepared_by" UUID,
      "reviewed_by" UUID,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'RELEASED', 'OBSOLETE') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
      "notes" TEXT,
      CONSTRAINT "PK_process_plans" PRIMARY KEY ("id")
      )
    `);

    // ── process_routings ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_routings" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "plan_id" UUID NOT NULL,
      "routing_number" VARCHAR(30) NOT NULL UNIQUE,
      "sequence_number" INTEGER NOT NULL,
      "operation_id" UUID,
      "operation_name" VARCHAR(200) NOT NULL,
      "machine_type_id" UUID,
      "work_centre" VARCHAR(50),
      "setup_time_hours" NUMERIC(6,2) NOT NULL DEFAULT 0,
      "run_time_hours" NUMERIC(6,2) NOT NULL DEFAULT 0,
      "queue_time_hours" NUMERIC(6,2) NOT NULL DEFAULT 0,
      "standard_cost" NUMERIC(10,2),
      "is_outsourced" BOOLEAN NOT NULL DEFAULT false,
      "vendor_id" UUID,
      "instructions" TEXT,
      CONSTRAINT "PK_process_routings" PRIMARY KEY ("id")
      )
    `);

    // ── process_steps ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_steps" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "routing_id" UUID NOT NULL,
      "step_number" INTEGER NOT NULL,
      "step_name" VARCHAR(200) NOT NULL,
      "step_description" TEXT,
      "tool_required" VARCHAR(100),
      "fixture_required" VARCHAR(100),
      "estimated_time_minutes" NUMERIC(8,2),
      "quality_checkpoints" JSONB,
      "is_critical" BOOLEAN NOT NULL DEFAULT false,
      "remarks" TEXT,
      CONSTRAINT "PK_process_steps" PRIMARY KEY ("id")
      )
    `);

    // ── resource_allocations ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resource_allocations" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "plan_id" UUID,
      "project_id" UUID,
      "resource_type" VARCHAR(50) CHECK ("resource_type" IN ('MACHINE', 'OPERATOR', 'TOOL', 'MATERIAL') OR "resource_type" IS NULL) NOT NULL,
      "resource_id" UUID NOT NULL,
      "resource_name" VARCHAR(100) NOT NULL,
      "start_date" DATE NOT NULL,
      "end_date" DATE NOT NULL,
      "allocated_hours" NUMERIC(8,2),
      "utilization_pct" NUMERIC(5,2) NOT NULL DEFAULT 100,
      "status" VARCHAR(50) CHECK ("status" IN ('PLANNED', 'CONFIRMED', 'RELEASED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'PLANNED',
      "remarks" TEXT,
      CONSTRAINT "PK_resource_allocations" PRIMARY KEY ("id")
      )
    `);

    // ── companies ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "name" VARCHAR(100) NOT NULL,
      "code" VARCHAR(20),
      "address" TEXT,
      "phone" VARCHAR(50),
      "email" VARCHAR(100),
      "tax_id" VARCHAR(50),
      CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    // ── notification_queue ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_queue" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "channel" VARCHAR(50) NOT NULL,
      "recipient" VARCHAR(255) NOT NULL,
      "subject" TEXT NOT NULL,
      "body" TEXT,
      "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
      "retry_count" INTEGER NOT NULL DEFAULT 0,
      "scheduled_at" TIMESTAMPTZ,
      "sent_at" TIMESTAMPTZ,
      "error" TEXT,
      CONSTRAINT "PK_notification_queue" PRIMARY KEY ("id")
      )
    `);

    // ── notification_templates ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_templates" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "code" VARCHAR(50) NOT NULL,
      "name" VARCHAR(100) NOT NULL,
      "subject" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "channel" VARCHAR(20) NOT NULL DEFAULT 'email',
      "variables" JSONB,
      CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id")
      )
    `);

    // ── system_settings ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "key" VARCHAR(50) NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "type" VARCHAR(50) NOT NULL,
      "description" TEXT,
      CONSTRAINT "PK_system_settings" PRIMARY KEY ("id")
      )
    `);

    // ── project_budgets ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_budgets" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID NOT NULL UNIQUE,
      "total_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "design_cost_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "material_cost_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "machining_cost_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "trial_cost_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "overhead_budgeted" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "total_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "design_cost_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "material_cost_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "machining_cost_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "trial_cost_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "overhead_actual" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "budget_variance" NUMERIC(18,2) NOT NULL DEFAULT 0,
      "budget_variance_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
      "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
      "last_updated_at" TIMESTAMPTZ,
      CONSTRAINT "PK_project_budgets" PRIMARY KEY ("id")
      )
    `);

    // ── project_milestones ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_milestones" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID NOT NULL,
      "milestone_name" VARCHAR(200) NOT NULL,
      "milestone_stage" VARCHAR(50) NOT NULL,
      "sequence_number" INTEGER NOT NULL DEFAULT 1,
      "planned_date" DATE,
      "actual_date" DATE,
      "revised_date" DATE,
      "days_variance" INTEGER NOT NULL DEFAULT 0,
      "owner_id" UUID,
      "completion_pct" INTEGER NOT NULL DEFAULT 0,
      "status" VARCHAR(50) CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'PENDING',
      "delay_reason" TEXT,
      "is_critical_path" BOOLEAN NOT NULL DEFAULT false,
      "remarks" TEXT,
      CONSTRAINT "PK_project_milestones" PRIMARY KEY ("id")
      )
    `);

    // ── project_resources ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_resources" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "project_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "user_name" VARCHAR(100) NOT NULL,
      "role" VARCHAR(50) CHECK ("role" IN ('PROJECT_MANAGER', 'DESIGN_LEAD', 'DESIGN_ENGINEER', 'PLANNING_ENGINEER', 'MACHINIST', 'QUALITY_ENGINEER', 'TOOLMAKER', 'OTHER') OR "role" IS NULL) NOT NULL DEFAULT 'OTHER',
      "allocation_pct" INTEGER NOT NULL DEFAULT 100,
      "start_date" DATE,
      "end_date" DATE,
      "is_primary" BOOLEAN NOT NULL DEFAULT false,
      "remarks" TEXT,
      CONSTRAINT "PK_project_resources" PRIMARY KEY ("id")
      )
    `);

    // ── capa_verifications ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capa_verifications" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "capa_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "trial_id" UUID,
      "capa_type" VARCHAR(50) CHECK ("capa_type" IN ('CORRECTIVE', 'PREVENTIVE') OR "capa_type" IS NULL) NOT NULL DEFAULT 'CORRECTIVE',
      "problem_description" TEXT NOT NULL,
      "root_cause" TEXT,
      "root_cause_method" VARCHAR(50),
      "corrective_action" TEXT,
      "preventive_action" TEXT,
      "responsible_person_id" UUID,
      "target_date" DATE,
      "implementation_date" DATE,
      "verified_by" UUID,
      "verification_date" DATE,
      "verification_evidence" TEXT,
      "effectiveness_confirmed" BOOLEAN,
      "status" VARCHAR(50) CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'CLOSED', 'REJECTED') OR "status" IS NULL) NOT NULL DEFAULT 'OPEN',
      "closed_at" TIMESTAMPTZ,
      CONSTRAINT "PK_capa_verifications" PRIMARY KEY ("id")
      )
    `);

    // ── inspection_reports ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inspection_reports" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "report_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "work_order_id" UUID,
      "inspection_type" VARCHAR(50) CHECK ("inspection_type" IN ('INCOMING', 'IN_PROCESS', 'FINAL', 'DIMENSIONAL', 'VISUAL') OR "inspection_type" IS NULL) NOT NULL DEFAULT 'FINAL',
      "inspection_date" DATE NOT NULL,
      "inspector_id" UUID,
      "sample_size" INTEGER NOT NULL DEFAULT 1,
      "accepted_qty" INTEGER NOT NULL DEFAULT 0,
      "rejected_qty" INTEGER NOT NULL DEFAULT 0,
      "overall_result" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      "defects_found" JSONB,
      "disposition" VARCHAR(50),
      "reviewed_by" UUID,
      "remarks" TEXT,
      CONSTRAINT "PK_inspection_reports" PRIMARY KEY ("id")
      )
    `);

    // ── retrials ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "retrials" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "retrial_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "original_trial_id" UUID,
      "retrial_sequence" INTEGER NOT NULL DEFAULT 1,
      "retrial_reason" TEXT NOT NULL,
      "changes_made" TEXT,
      "scheduled_date" DATE,
      "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
      "requested_by" UUID,
      "approved_by" UUID,
      "remarks" TEXT,
      CONSTRAINT "PK_retrials" PRIMARY KEY ("id")
      )
    `);

    // ── retrial_results ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "retrial_results" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "retrial_id" UUID NOT NULL,
      "trial_observation_id" UUID,
      "result" VARCHAR(20) NOT NULL,
      "summary" TEXT,
      "issues_resolved" JSONB,
      "pending_issues" JSONB,
      "approved_for_dispatch" BOOLEAN NOT NULL DEFAULT false,
      "approved_by" UUID,
      "approved_at" TIMESTAMPTZ,
      "remarks" TEXT,
      CONSTRAINT "PK_retrial_results" PRIMARY KEY ("id")
      )
    `);

    // ── trial_measurements ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trial_measurements" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "trial_id" UUID NOT NULL,
      "parameter_name" VARCHAR(200) NOT NULL,
      "parameter_category" VARCHAR(50),
      "nominal_value" NUMERIC(12,4),
      "upper_tolerance" NUMERIC(12,4),
      "lower_tolerance" NUMERIC(12,4),
      "actual_value" NUMERIC(12,4),
      "unit" VARCHAR(20),
      "measuring_instrument" VARCHAR(100),
      "is_critical" BOOLEAN NOT NULL DEFAULT false,
      "pass_fail" VARCHAR(10),
      "measured_by" UUID,
      "remarks" TEXT,
      CONSTRAINT "PK_trial_measurements" PRIMARY KEY ("id")
      )
    `);

    // ── trial_observations ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trial_observations" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "trial_number" VARCHAR(30) NOT NULL UNIQUE,
      "project_id" UUID,
      "trial_sequence" INTEGER NOT NULL DEFAULT 1,
      "trial_type" VARCHAR(50) CHECK ("trial_type" IN ('INTERNAL', 'CUSTOMER', 'RETRIAL') OR "trial_type" IS NULL) NOT NULL DEFAULT 'INTERNAL',
      "trial_date" DATE NOT NULL,
      "shift" VARCHAR(20),
      "machine_id" UUID,
      "mold_temperature_c" NUMERIC(6,1),
      "material_temperature_c" NUMERIC(6,1),
      "injection_pressure_bar" NUMERIC(8,2),
      "cycle_time_seconds" NUMERIC(6,2),
      "shots_taken" INTEGER NOT NULL DEFAULT 0,
      "good_parts" INTEGER NOT NULL DEFAULT 0,
      "rejected_parts" INTEGER NOT NULL DEFAULT 0,
      "observations" TEXT,
      "defects_observed" JSONB,
      "corrective_actions" TEXT,
      "result" VARCHAR(50) CHECK ("result" IN ('PASS', 'FAIL', 'CONDITIONAL', 'PENDING') OR "result" IS NULL) NOT NULL DEFAULT 'PENDING',
      "conducted_by" UUID,
      "witnessed_by" UUID,
      "customer_representative" VARCHAR(100),
      "next_action" TEXT,
      CONSTRAINT "PK_trial_observations" PRIMARY KEY ("id")
      )
    `);

    // ── search_indexes ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "search_indexes" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" UUID NOT NULL,
      "display_title" VARCHAR(300) NOT NULL,
      "searchable_text" TEXT NOT NULL,
      "keywords" JSONB,
      "metadata" JSONB,
      "url_path" VARCHAR(300),
      "indexed_at" TIMESTAMPTZ,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "PK_search_indexes" PRIMARY KEY ("id")
      )
    `);

    // ── service_reports ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_reports" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "report_number" VARCHAR(30) NOT NULL UNIQUE,
      "service_request_id" UUID NOT NULL,
      "service_date" DATE NOT NULL,
      "technician_id" UUID,
      "work_performed" TEXT NOT NULL,
      "parts_replaced" JSONB,
      "root_cause_found" TEXT,
      "time_spent_hours" NUMERIC(6,2),
      "labour_cost" NUMERIC(10,2),
      "parts_cost" NUMERIC(10,2),
      "total_cost" NUMERIC(10,2),
      "mold_condition_after" VARCHAR(50),
      "recommendations" TEXT,
      "customer_sign_off" BOOLEAN NOT NULL DEFAULT false,
      "customer_signed_by" VARCHAR(100),
      "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      CONSTRAINT "PK_service_reports" PRIMARY KEY ("id")
      )
    `);

    // ── service_requests ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_requests" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "sr_number" VARCHAR(30) NOT NULL UNIQUE,
      "mold_id" UUID,
      "mold_number" VARCHAR(30),
      "project_id" UUID,
      "customer_id" UUID,
      "customer_name" VARCHAR(200),
      "service_type" VARCHAR(50) CHECK ("service_type" IN ('REPAIR', 'MAINTENANCE', 'MODIFICATION', 'INSPECTION', 'EMERGENCY') OR "service_type" IS NULL) NOT NULL DEFAULT 'REPAIR',
      "issue_description" TEXT NOT NULL,
      "reported_by" VARCHAR(100),
      "reported_date" DATE NOT NULL,
      "priority" VARCHAR(50) CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') OR "priority" IS NULL) NOT NULL DEFAULT 'MEDIUM',
      "assigned_technician_id" UUID,
      "estimated_completion_date" DATE,
      "actual_completion_date" DATE,
      "mold_shots_at_request" INTEGER,
      "status" VARCHAR(50) CHECK ("status" IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'OPEN',
      "resolution_summary" TEXT,
      "customer_feedback" TEXT,
      "warranty_claim" BOOLEAN NOT NULL DEFAULT false,
      "cost_estimate" NUMERIC(18,2),
      "actual_cost" NUMERIC(18,2),
      CONSTRAINT "PK_service_requests" PRIMARY KEY ("id")
      )
    `);

    // ── service_schedules ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_schedules" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "service_request_id" UUID NOT NULL,
      "scheduled_date" DATE NOT NULL,
      "scheduled_start_time" TIMESTAMPTZ,
      "estimated_duration_hours" NUMERIC(5,2),
      "technician_id" UUID,
      "location" VARCHAR(100),
      "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
      "notes" TEXT,
      CONSTRAINT "PK_service_schedules" PRIMARY KEY ("id")
      )
    `);

    // ── spare_parts ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spare_parts" (
      "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "deleted_at" TIMESTAMPTZ,
      "created_by" UUID,
      "updated_by" UUID,
      "tenant_id"  UUID,
      "part_code" VARCHAR(30) NOT NULL UNIQUE,
      "part_name" VARCHAR(200) NOT NULL,
      "part_category" VARCHAR(50),
      "compatible_mold_types" JSONB,
      "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'NOS',
      "unit_cost" NUMERIC(10,2),
      "stock_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "min_stock_qty" NUMERIC(10,3) NOT NULL DEFAULT 0,
      "reorder_qty" NUMERIC(10,3),
      "lead_time_days" INTEGER,
      "preferred_supplier" VARCHAR(100),
      "store_location" VARCHAR(50),
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "description" TEXT,
      CONSTRAINT "PK_spare_parts" PRIMARY KEY ("id")
      )
    `);

    // ── Per-table composite indexes: tenant_id + deleted_at ──────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_tnt_del" ON "activity_logs" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_attachments_tnt_del" ON "attachments" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_tnt_del" ON "comments" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_custom_fields_tnt_del" ON "custom_fields" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_custom_field_values_tnt_del" ON "custom_field_values" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notes_tnt_del" ON "notes" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_credit_notes_tnt_del" ON "credit_notes" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_enquiries_tnt_del" ON "enquiries" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invoices_tnt_del" ON "invoices" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_tnt_del" ON "payments" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quotations_tnt_del" ON "quotations" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_quotation_items_tnt_del" ON "quotation_items" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cps_approvals_tnt_del" ON "cps_approvals" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cps_checklists_tnt_del" ON "cps_checklists" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cps_requirements_tnt_del" ON "cps_requirements" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cps_reviews_tnt_del" ON "cps_reviews" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_cps_review_items_tnt_del" ON "cps_review_items" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_approvals_tnt_del" ON "customer_approvals" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_approval_files_tnt_del" ON "customer_approval_files" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customer_approval_history_tnt_del" ON "customer_approval_history" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_approvals_tnt_del" ON "design_approvals" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_boms_tnt_del" ON "design_boms" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_files_tnt_del" ON "design_files" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_parts_tnt_del" ON "design_parts" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_revisions_tnt_del" ON "design_revisions" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_design_standards_tnt_del" ON "design_standards" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_downloads_tnt_del" ON "document_downloads" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_versions_tnt_del" ON "document_versions" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eco_implementations_tnt_del" ON "eco_implementations" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ecr_affected_parts_tnt_del" ON "ecr_affected_parts" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_engineering_change_orders_tnt_del" ON "engineering_change_orders" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_engineering_change_requests_tnt_del" ON "engineering_change_requests" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_file_classification_rules_tnt_del" ON "file_classification_rules" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_file_relationships_tnt_del" ON "file_relationships" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_folder_scan_jobs_tnt_del" ON "folder_scan_jobs" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_folder_scan_results_tnt_del" ON "folder_scan_results" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_folders_tnt_del" ON "project_folders" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_articles_tnt_del" ON "knowledge_articles" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_attachments_tnt_del" ON "knowledge_attachments" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_categories_tnt_del" ON "knowledge_categories" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_knowledge_tags_tnt_del" ON "knowledge_tags" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_bookings_tnt_del" ON "machine_bookings" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_calendars_tnt_del" ON "machine_calendars" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_masters_tnt_del" ON "machine_masters" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_types_tnt_del" ON "machine_types" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_job_cards_tnt_del" ON "job_cards" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_material_issues_tnt_del" ON "material_issues" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_operations_tnt_del" ON "operations" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_operation_logs_tnt_del" ON "operation_logs" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_production_batches_tnt_del" ON "production_batches" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_orders_tnt_del" ON "work_orders" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_component_materials_tnt_del" ON "component_materials" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mold_assemblies_tnt_del" ON "mold_assemblies" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mold_components_tnt_del" ON "mold_components" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mold_specifications_tnt_del" ON "mold_specifications" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mold_structures_tnt_del" ON "mold_structures" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_plans_tnt_del" ON "process_plans" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_routings_tnt_del" ON "process_routings" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_steps_tnt_del" ON "process_steps" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_resource_allocations_tnt_del" ON "resource_allocations" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_companies_tnt_del" ON "companies" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_queue_tnt_del" ON "notification_queue" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notification_templates_tnt_del" ON "notification_templates" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_system_settings_tnt_del" ON "system_settings" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_budgets_tnt_del" ON "project_budgets" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_milestones_tnt_del" ON "project_milestones" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_project_resources_tnt_del" ON "project_resources" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_capa_verifications_tnt_del" ON "capa_verifications" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inspection_reports_tnt_del" ON "inspection_reports" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrials_tnt_del" ON "retrials" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_retrial_results_tnt_del" ON "retrial_results" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_measurements_tnt_del" ON "trial_measurements" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trial_observations_tnt_del" ON "trial_observations" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_search_indexes_tnt_del" ON "search_indexes" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_reports_tnt_del" ON "service_reports" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_tnt_del" ON "service_requests" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_schedules_tnt_del" ON "service_schedules" ("tenant_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spare_parts_tnt_del" ON "spare_parts" ("tenant_id", "deleted_at")`);

    console.info('[Migration003] Full domain schema created — 78 tables.');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse creation order to respect FK constraints.
    await queryRunner.query(`DROP TABLE IF EXISTS "spare_parts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "search_indexes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trial_observations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trial_measurements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retrial_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "retrials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inspection_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "capa_verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_resources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_milestones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_budgets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_queue"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resource_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "process_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "process_routings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "process_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mold_structures"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mold_specifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mold_components"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mold_assemblies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "component_materials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "production_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operation_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_issues"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_cards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_masters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_calendars"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_articles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_folders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "folder_scan_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "folder_scan_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "file_relationships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "file_classification_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_change_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engineering_change_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ecr_affected_parts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "eco_implementations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_downloads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_standards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_revisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_parts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_boms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "design_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_approval_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_approval_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cps_review_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cps_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cps_requirements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cps_checklists"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cps_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotation_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enquiries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
  }
}