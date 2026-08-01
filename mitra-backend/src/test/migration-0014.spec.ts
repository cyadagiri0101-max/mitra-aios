import { DataIntegrityRemediation1700000000014 } from '../database/migrations/1700000000014-DataIntegrityRemediation';

describe('Migration 0014 — DataIntegrityRemediation (structural)', () => {
  const run = async (direction: 'up' | 'down') => {
    const queries: string[] = [];
    const queryRunner: any = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
      }),
    };
    const migration = new DataIntegrityRemediation1700000000014();
    await migration[direction](queryRunner);
    return queries;
  };

  it('up() adds version to workflow_instances for optimistic locking', async () => {
    const queries = await run('up');
    expect(queries.some((q) => q.includes('ALTER TABLE "workflow_instances"') && q.includes('ADD COLUMN IF NOT EXISTS "version"'))).toBe(true);
  });

  it('up() replaces full UNIQUE constraints with partial unique indexes', async () => {
    const queries = await run('up');
    for (const table of ['customers', 'leads', 'rfqs', 'customer_types', 'customer_categories']) {
      expect(queries.some((q) => q.includes(`DROP CONSTRAINT IF EXISTS "${table}_`))).toBe(true);
      expect(queries.some((q) => q.includes(`uq_${table}_`) && q.includes('WHERE "deleted_at" IS NULL'))).toBe(true);
    }
  });

  it('up() adds the missing leads and rfqs foreign keys', async () => {
    const queries = await run('up');
    for (const fk of ['fk_leads_contact', 'fk_leads_owner', 'fk_leads_converted_customer', 'fk_rfqs_enquiry', 'fk_rfqs_contact']) {
      expect(queries.some((q) => q.includes(`ADD CONSTRAINT IF NOT EXISTS "${fk}"`) && q.includes('ON DELETE SET NULL'))).toBe(true);
    }
  });

  it('up() adds the missing indexes', async () => {
    const queries = await run('up');
    expect(queries.some((q) => q.includes('IDX_rfqs_enquiry'))).toBe(true);
    expect(queries.some((q) => q.includes('IDX_customer_activities_reference') && q.includes('"reference_type", "reference_id"'))).toBe(true);
  });

  it('down() restores the full UNIQUE constraints and drops the partial indexes', async () => {
    const queries = await run('down');
    for (const table of ['customers', 'leads', 'rfqs', 'customer_types', 'customer_categories']) {
      expect(queries.some((q) => q.includes(`DROP INDEX IF EXISTS "uq_${table}_`))).toBe(true);
      expect(queries.some((q) => q.includes(`ADD CONSTRAINT "${table}_`) && q.includes('UNIQUE'))).toBe(true);
    }
    expect(queries.some((q) => q.includes('DROP COLUMN IF EXISTS "version"'))).toBe(true);
  });

  it('down() removes every foreign key and index added by up()', async () => {
    const queries = await run('down');
    for (const fk of ['fk_leads_contact', 'fk_leads_owner', 'fk_leads_converted_customer', 'fk_rfqs_enquiry', 'fk_rfqs_contact']) {
      expect(queries.some((q) => q.includes(`DROP CONSTRAINT IF EXISTS "${fk}"`))).toBe(true);
    }
    expect(queries.some((q) => q.includes('DROP INDEX IF EXISTS "IDX_rfqs_enquiry"'))).toBe(true);
    expect(queries.some((q) => q.includes('DROP INDEX IF EXISTS "IDX_customer_activities_reference"'))).toBe(true);
  });
});
