import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `machine:read` permission (resource `machine`, action `read`) that
 * the AI-usage and machine-status controllers require via @Permissions.
 *
 * The original PermissionSeed migration only seeded `manufacturing:machine:*`,
 * so every request to /api/ai-usage/* and /api/machine-status/* was rejected
 * with 403 Forbidden for all roles (including ADMIN).
 */
export class MachineReadPermission1700000000020 implements MigrationInterface {
  name = 'MachineReadPermission1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
      ['machine', 'read'],
    );

    // Grant to both role systems: the legacy lowercase system roles seeded by
    // migration 0010, and the live uppercase app roles seeded at runtime
    // (ADMIN, MANAGEMENT, PLANNING, PRODUCTION) — mirroring the
    // SecurityRemediation migration's approach.
    const roles = [
      'admin', 'manager', 'production_planner', 'operator', 'viewer',
      'ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION',
    ];
    for (const roleName of roles) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
         ON CONFLICT DO NOTHING`,
        [roleName, 'machine', 'read'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions
       WHERE permission_id = (SELECT id FROM permissions WHERE resource = $1 AND action = $2)`,
      ['machine', 'read'],
    );
    await queryRunner.query(
      `DELETE FROM permissions WHERE resource = $1 AND action = $2`,
      ['machine', 'read'],
    );
  }
}
