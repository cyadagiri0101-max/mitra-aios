import {
  WORK_ORDER_TRANSITIONS,
  WORK_ORDER_WORKFLOW_TYPE,
  JOB_TRANSITIONS,
  JOB_WORKFLOW_TYPE,
  SCHEDULE_PRIORITY_ORDER,
  TERMINAL_JOB_STATUSES,
} from './manufacturing.constants';

describe('manufacturing.constants', () => {
  it('defines the work-order workflow type and all 14 seeded transition UUIDs', () => {
    expect(WORK_ORDER_WORKFLOW_TYPE).toBe('manufacturing_work_order');
    const keys = Object.keys(WORK_ORDER_TRANSITIONS);
    expect(keys).toHaveLength(14);
    for (const [key, uuid] of Object.entries(WORK_ORDER_TRANSITIONS)) {
      expect(key).toMatch(/^[A-Z_]+$/);
      expect(String(uuid)).toMatch(/^b2000000-0000-4000-8000-000000000\d{3}$/);
    }
  });

  it('defines the job workflow type and all 10 seeded transition UUIDs', () => {
    expect(JOB_WORKFLOW_TYPE).toBe('manufacturing_job');
    const keys = Object.keys(JOB_TRANSITIONS);
    expect(keys).toHaveLength(10);
    for (const [key, uuid] of Object.entries(JOB_TRANSITIONS)) {
      expect(key).toMatch(/^[A-Z_]+$/);
      expect(String(uuid)).toMatch(/^d4000000-0000-4000-8000-000000000\d{3}$/);
    }
  });

  it('has a stable scheduling priority order', () => {
    expect(SCHEDULE_PRIORITY_ORDER).toEqual(['URGENT', 'HIGH', 'NORMAL', 'LOW']);
  });

  it('defines the terminal job statuses used for work-order roll-up', () => {
    expect(TERMINAL_JOB_STATUSES).toEqual(['COMPLETED', 'CANCELLED', 'SCRAPPED']);
  });

  it('every transition key maps to a real seeded UUID', () => {
    const all = [...Object.values(WORK_ORDER_TRANSITIONS), ...Object.values(JOB_TRANSITIONS)];
    expect(all.every((v) => typeof v === 'string' && v.length === 36)).toBe(true);
  });
});
