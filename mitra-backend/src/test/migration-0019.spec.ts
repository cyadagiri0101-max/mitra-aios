import { MesImplementation1700000000019 } from '../database/migrations/1700000000019-MesImplementation';

describe('Migration 0019 — MesImplementation (structural)', () => {
  const run = async (direction: 'up' | 'down') => {
    const queries: string[] = [];
    const params: any[] = [];
    const queryRunner: any = {
      query: jest.fn(async (sql: string, p?: any[]) => {
        queries.push(sql.replace(/\s+/g, ' ').trim());
        if (Array.isArray(p)) params.push(...p);
      }),
    };
    const migration = new MesImplementation1700000000019();
    await migration[direction](queryRunner);
    return { queries, params };
  };

  it('up() extends the work_orders status check to the full MES lifecycle', async () => {
    const { queries } = await run('up');
    expect(queries.some((q) => q.includes('ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_status_check"'))).toBe(true);
    const check = queries.find((q) => q.includes('ADD CONSTRAINT') && q.includes("'DRAFT','RELEASED','IN_PROGRESS','PAUSED','ON_HOLD','REWORK','COMPLETED','CANCELLED','SCRAPPED'"));
    expect(check).toBeTruthy();
  });

  it('up() adds the MES columns to work_orders', async () => {
    const { queries } = await run('up');
    for (const col of ['snapshot', 'cost_baseline', 'rework_qty', 'scrap_qty', 'released_by', 'released_at']) {
      expect(queries.some((q) => q.includes('ADD COLUMN IF NOT EXISTS') && q.includes(`"${col}"`))).toBe(true);
    }
  });

  it('up() extends job_cards and operation_logs with execution columns', async () => {
    const { queries } = await run('up');
    for (const col of ['operation_number', 'operation_code', 'produced_qty', 'rejected_qty', 'rework_qty', 'scrap_qty', 'setup_time_minutes', 'downtime_minutes', 'started_at', 'completed_at', 'hold_reason']) {
      expect(queries.some((q) => q.includes('ALTER TABLE "job_cards"') && q.includes(`ADD COLUMN IF NOT EXISTS "${col}"`))).toBe(true);
    }
    for (const col of ['job_card_id', 'operation_id', 'rework_qty', 'scrap_qty', 'setup_time_minutes']) {
      expect(queries.some((q) => q.includes('ALTER TABLE "operation_logs"') && q.includes(`ADD COLUMN IF NOT EXISTS "${col}"`))).toBe(true);
    }
  });

  it('up() creates the three MES tables', async () => {
    const { queries } = await run('up');
    for (const table of ['inspection_checkpoints', 'material_reservations', 'ncr_records']) {
      expect(queries.some((q) => q.includes(`CREATE TABLE IF NOT EXISTS "${table}"`))).toBe(true);
    }
  });

  it('up() seeds the manufacturing_work_order workflow (9 states + 14 transitions)', async () => {
    const { queries } = await run('up');
    const stateSeeds = queries.filter((q) => q.includes('INSERT INTO "workflow_states"') && q.includes('manufacturing_work_order'));
    const transitionSeeds = queries.filter((q) => q.includes('INSERT INTO "workflow_transitions"') && q.includes('manufacturing_work_order'));
    expect(stateSeeds.some((q) => q.includes('ON CONFLICT'))).toBe(true);
    expect(stateSeeds.join(' ').match(/a1000000-/g)?.length).toBe(9);
    expect(transitionSeeds.join(' ').match(/b2000000-/g)?.length).toBe(14);
  });

  it('up() seeds the manufacturing_job workflow (8 states + 10 transitions)', async () => {
    const { queries } = await run('up');
    const stateSeeds = queries.filter((q) => q.includes('INSERT INTO "workflow_states"') && q.includes('manufacturing_job'));
    const transitionSeeds = queries.filter((q) => q.includes('INSERT INTO "workflow_transitions"') && q.includes('manufacturing_job'));
    expect(stateSeeds.join(' ').match(/c3000000-/g)?.length).toBe(8);
    expect(transitionSeeds.join(' ').match(/d4000000-/g)?.length).toBe(10);
  });

  it('up() seeds the MES permissions and role grants', async () => {
    const { queries, params } = await run('up');
    const perms: string[] = [];
    for (let i = 0; i + 1 < params.length; i += 2) {
      if (typeof params[i] === 'string' && typeof params[i + 1] === 'string') {
        perms.push(`${params[i]}:${params[i + 1]}`);
      }
    }
    expect(perms).toContain('manufacturing:work_order:release');
    expect(perms).toContain('manufacturing:job_card:complete');
    expect(perms).toContain('manufacturing:machine:maintain');
    expect(perms).toContain('manufacturing:inspection:record');
    expect(queries.some((q) => q.includes('INSERT INTO role_permissions'))).toBe(true);
  });

  it('down() drops the MES tables and columns', async () => {
    const { queries } = await run('down');
    for (const table of ['inspection_checkpoints', 'material_reservations', 'ncr_records']) {
      expect(queries.some((q) => q.includes(`DROP TABLE IF EXISTS "${table}"`))).toBe(true);
    }
    for (const col of ['snapshot', 'cost_baseline', 'rework_qty', 'scrap_qty', 'released_by', 'released_at']) {
      expect(queries.some((q) => q.includes('ALTER TABLE "work_orders"') && q.includes(`DROP COLUMN IF EXISTS "${col}"`))).toBe(true);
    }
  });

  it('down() removes the MES permissions', async () => {
    const { queries, params } = await run('down');
    const pairs: string[] = [];
    for (let i = 0; i + 1 < params.length; i += 2) {
      if (typeof params[i] === 'string' && typeof params[i + 1] === 'string') {
        pairs.push(`${params[i]}:${params[i + 1]}`);
      }
    }
    expect(queries.some((q) => q.includes('DELETE FROM "role_permissions"'))).toBe(true);
    expect(queries.some((q) => q.includes('DELETE FROM "permissions"') && q.includes('resource'))).toBe(true);
    expect(pairs).toContain('manufacturing:work_order:release');
    expect(pairs).toContain('manufacturing:job_card:complete');
  });
});
