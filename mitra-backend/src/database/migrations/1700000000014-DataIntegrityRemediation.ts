import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DataIntegrityRemediation — Sprint 2.1.1 (P2 remediation)
 *
 *   1. Adds `version` to workflow_instances for @VersionColumn optimistic
 *      locking (concurrent transitions must not silently overwrite).
 *   2. Converts full UNIQUE constraints on soft-deleted business keys to
 *      PARTIAL unique indexes (WHERE deleted_at IS NULL) so a soft-deleted
 *      record's number/code can be reused without colliding (M-3).
 *   3. Adds missing foreign keys for leads (contact/owner/converted_customer)
 *      and rfqs (enquiry/contact) — referential integrity (M-12).
 *   4. Adds missing indexes (rfqs.enquiry_id, polymorphic reference_id).
 */
export class DataIntegrityRemediation1700000000014 implements MigrationInterface {
  name = 'DataIntegrityRemediation1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Optimistic locking on workflow instances ──────────────────────
    await queryRunner.query(`
      ALTER TABLE "workflow_instances"
        ADD COLUMN IF NOT EXISTS "version" INT NOT NULL DEFAULT 1
    `);

    // ── 2. Partial unique indexes (soft-delete friendly) ─────────────────
    // Drop full UNIQUE constraints, replace with partial unique indexes.
    const uniqueColumns: { table: string; column: string; constraint: string }[] = [
      { table: 'customers',            column: 'code',            constraint: 'customers_code_key' },
      { table: 'leads',                column: 'lead_number',     constraint: 'leads_lead_number_key' },
      { table: 'rfqs',                 column: 'rfq_number',      constraint: 'rfqs_rfq_number_key' },
      { table: 'customer_types',       column: 'code',            constraint: 'customer_types_code_key' },
      { table: 'customer_categories',  column: 'code',            constraint: 'customer_categories_code_key' },
    ];
    for (const c of uniqueColumns) {
      await queryRunner.query(
        `ALTER TABLE "${c.table}" DROP CONSTRAINT IF EXISTS "${c.constraint}"`,
      );
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uq_${c.table}_${c.column}_active"
          ON "${c.table}" ("${c.column}") WHERE "deleted_at" IS NULL AND "${c.column}" IS NOT NULL
      `);
    }

    // ── 3. Missing foreign keys ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD CONSTRAINT IF NOT EXISTS "fk_leads_contact"
        FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD CONSTRAINT IF NOT EXISTS "fk_leads_owner"
        FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "leads"
        ADD CONSTRAINT IF NOT EXISTS "fk_leads_converted_customer"
        FOREIGN KEY ("converted_customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "rfqs"
        ADD CONSTRAINT IF NOT EXISTS "fk_rfqs_enquiry"
        FOREIGN KEY ("enquiry_id") REFERENCES "enquiries" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "rfqs"
        ADD CONSTRAINT IF NOT EXISTS "fk_rfqs_contact"
        FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL
    `);

    // ── 4. Missing indexes ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rfqs_enquiry" ON "rfqs" ("enquiry_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_activities_reference"
        ON "customer_activities" ("reference_type", "reference_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_activities_reference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rfqs_enquiry"`);
    await queryRunner.query(`ALTER TABLE "rfqs" DROP CONSTRAINT IF EXISTS "fk_rfqs_contact"`);
    await queryRunner.query(`ALTER TABLE "rfqs" DROP CONSTRAINT IF EXISTS "fk_rfqs_enquiry"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "fk_leads_converted_customer"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "fk_leads_owner"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "fk_leads_contact"`);

    for (const c of [
      { table: 'customers', column: 'code' },
      { table: 'leads', column: 'lead_number' },
      { table: 'rfqs', column: 'rfq_number' },
      { table: 'customer_types', column: 'code' },
      { table: 'customer_categories', column: 'code' },
    ]) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "uq_${c.table}_${c.column}_active"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${c.table}" ADD CONSTRAINT "${c.table}_${c.column}_key" UNIQUE ("${c.column}")`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "workflow_instances" DROP COLUMN IF EXISTS "version"
    `);
  }
}
