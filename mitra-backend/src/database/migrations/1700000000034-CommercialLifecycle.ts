import { MigrationInterface, QueryRunner } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────
// MITRA v4.1 — Sprint 2: Commercial lifecycle completion
//
// Adds the Sales Order bounded context (sales_orders + sales_order_lines),
// invoice line items (invoice_lines), links invoices/credit notes to sales
// orders, aligns credit-note status to a controlled enum, and seeds the
// RBAC permissions for the new commercial capabilities.
// ─────────────────────────────────────────────────────────────────────────

export class CommercialLifecycle1700000000034 implements MigrationInterface {
  name = 'CommercialLifecycle1700000000034';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── sales_orders ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_orders" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "sales_order_number" VARCHAR(30) NOT NULL UNIQUE,
        "quotation_id" UUID,
        "project_id" UUID,
        "customer_id" UUID,
        "customer_name" VARCHAR(200) NOT NULL,
        "order_date" DATE NOT NULL,
        "delivery_date" DATE,
        "subtotal" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "tax_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "total_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        "payment_terms" TEXT,
        "delivery_terms" TEXT,
        "cancelled_reason" TEXT,
        "cancelled_at" TIMESTAMPTZ,
        "status" VARCHAR(50) CHECK ("status" IN ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED') OR "status" IS NULL) NOT NULL DEFAULT 'DRAFT',
        "notes" TEXT,
        "version" INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT "pk_sales_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_number" ON "sales_orders" ("sales_order_number", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_quotation" ON "sales_orders" ("quotation_id", "status", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_project" ON "sales_orders" ("project_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_customer" ON "sales_orders" ("customer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_tenant" ON "sales_orders" ("tenant_id")`);

    // ── sales_order_lines ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_order_lines" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "sales_order_id" UUID NOT NULL,
        "quotation_item_id" UUID,
        "line_number" INTEGER NOT NULL,
        "item_code" VARCHAR(50),
        "description" TEXT NOT NULL,
        "item_category" VARCHAR(50),
        "quantity" NUMERIC(10,3) NOT NULL DEFAULT 1,
        "unit" VARCHAR(20) NOT NULL DEFAULT 'NOS',
        "unit_price" NUMERIC(18,2) NOT NULL,
        "tax_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "line_total" NUMERIC(18,2) NOT NULL,
        "delivery_date" DATE,
        "remarks" TEXT,
        CONSTRAINT "pk_sales_order_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sales_order_lines_order" ON "sales_order_lines" ("sales_order_id", "deleted_at")`);

    // ── invoice_lines ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice_lines" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "tenant_id" UUID,
        "invoice_id" UUID NOT NULL,
        "sales_order_line_id" UUID,
        "line_number" INTEGER NOT NULL,
        "item_code" VARCHAR(50),
        "description" TEXT NOT NULL,
        "item_category" VARCHAR(50),
        "quantity" NUMERIC(10,3) NOT NULL DEFAULT 1,
        "unit" VARCHAR(20) NOT NULL DEFAULT 'NOS',
        "unit_price" NUMERIC(18,2) NOT NULL,
        "tax_pct" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "line_total" NUMERIC(18,2) NOT NULL,
        CONSTRAINT "pk_invoice_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_invoice_lines_invoice" ON "invoice_lines" ("invoice_id", "deleted_at")`);

    // ── invoices.sales_order_id ────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sales_order_id" UUID`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_invoices_sales_order" ON "invoices" ("sales_order_id")`);

    // ── credit_notes: sales order link + controlled status lifecycle ───────
    await queryRunner.query(`ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "sales_order_id" UUID`);
    await queryRunner.query(`ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "applied_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "applied_by" UUID`);
    await queryRunner.query(`ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "cancelled_reason" TEXT`);
    await queryRunner.query(`ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credit_notes_sales_order" ON "credit_notes" ("sales_order_id")`);
    await queryRunner.query(`
      ALTER TABLE "credit_notes"
      ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::VARCHAR(50),
      ALTER COLUMN "status" SET DEFAULT 'OPEN'
    `);

    // ── RBAC permissions for the new commercial capabilities ───────────────
    const permissions: Array<[string, string, string]> = [
      ['salesOrder', 'read', 'salesOrder read'],
      ['salesOrder', 'create', 'salesOrder create'],
      ['salesOrder', 'update', 'salesOrder update'],
      ['salesOrder', 'delete', 'salesOrder delete'],
      ['salesOrder', 'approve', 'salesOrder approve'],
      ['invoice', 'read', 'invoice read'],
      ['invoice', 'create', 'invoice create'],
      ['invoice', 'update', 'invoice update'],
      ['invoice', 'delete', 'invoice delete'],
      ['invoice', 'approve', 'invoice approve'],
      ['payment', 'read', 'payment read'],
      ['payment', 'create', 'payment create'],
      ['payment', 'verify', 'payment verify'],
      ['creditNote', 'read', 'creditNote read'],
      ['creditNote', 'create', 'creditNote create'],
      ['creditNote', 'apply', 'creditNote apply'],
      ['creditNote', 'cancel', 'creditNote cancel'],
    ];
    for (const [resource, action, description] of permissions) {
      await queryRunner.query(`
        INSERT INTO permissions ("id", resource, action, description, "created_at", "updated_at")
        SELECT uuid_generate_v4(), $1::varchar, $2::varchar, $3::text, now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM permissions WHERE resource = $1::varchar AND action = $2::varchar
        )
      `, [resource, action, description]);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_order_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_orders"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "sales_order_id"`);
    await queryRunner.query(`ALTER TABLE "credit_notes" DROP COLUMN IF EXISTS "sales_order_id"`);
    await queryRunner.query(`ALTER TABLE "credit_notes" DROP COLUMN IF EXISTS "applied_at"`);
    await queryRunner.query(`ALTER TABLE "credit_notes" DROP COLUMN IF EXISTS "applied_by"`);
    await queryRunner.query(`ALTER TABLE "credit_notes" DROP COLUMN IF EXISTS "cancelled_reason"`);
    await queryRunner.query(`ALTER TABLE "credit_notes" DROP COLUMN IF EXISTS "cancelled_at"`);
    await queryRunner.query(`DELETE FROM permissions WHERE (resource = 'salesOrder' OR resource = 'invoice' OR resource = 'payment' OR resource = 'creditNote')`);
  }
}
