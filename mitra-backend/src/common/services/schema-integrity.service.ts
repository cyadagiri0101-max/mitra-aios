import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * SchemaIntegrityService — startup validation (C-2 remediation).
 *
 * Verifies that critical columns declared by the entities actually exist in
 * the database. With synchronize:false, a drift between entity and migration
 * silently breaks every query touching the missing column at runtime.
 * This service fails fast at boot instead.
 *
 * The check is intentionally lightweight (information_schema lookups) and
 * runs on every boot; missing columns throw before the HTTP server listens.
 */
@Injectable()
export class SchemaIntegrityService implements OnModuleInit {
  private readonly logger = new Logger(SchemaIntegrityService.name);

  // table -> columns that MUST exist (entity contract)
  private static readonly REQUIRED_COLUMNS: Record<string, string[]> = {
    audit_logs: ['event_type'],
    workflow_instances: ['version'],
    workflow_transitions: ['required_roles', 'required_permissions', 'requires_approval'],
    rfqs: ['version'],
    quotations: ['version'],
    leads: ['version'],
    customers: ['version'],
  };

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    const missing: string[] = [];

    for (const [table, columns] of Object.entries(SchemaIntegrityService.REQUIRED_COLUMNS)) {
      let existing: { column_name: string }[] = [];
      try {
        existing = await this.dataSource.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
          [table],
        );
      } catch (err) {
        // Table itself may not exist on a fresh (pre-migration) database —
        // in that case migration tooling will create it before boot.
        const msg = (err as Error).message ?? String(err);
        this.logger.warn(`Schema check: table "${table}" not queryable (${msg}). Skipping.`);
        continue;
      }
      const present = new Set(existing.map((c) => c.column_name));
      for (const column of columns) {
        if (!present.has(column)) {
          missing.push(`${table}.${column}`);
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(
        '[MITRA] Schema integrity check FAILED — missing columns: ' +
          `${missing.join(', ')}. ` +
          'Run `npm run migration:run` before starting the application.',
      );
    }

    this.logger.log('Schema integrity check passed');
  }
}
