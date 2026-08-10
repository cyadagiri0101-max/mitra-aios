import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `analytics:read` and `analytics:report:read` permissions required
 * by the analytics controller (@Permissions on /api/analytics/*).
 *
 * These permissions were never seeded (neither by the PermissionSeed
 * migration nor the runtime seed script), so every analytics request was
 * rejected with 403 for all roles — including ADMIN, whose grant set is a
 * snapshot of the permissions table taken at seed time.
 */
export class AnalyticsReadPermission1700000000022 implements MigrationInterface {
  name = 'AnalyticsReadPermission1700000000022';

  private readonly perms: Array<[string, string]> = [
    ['analytics', 'read'],
    ['analytics', 'report:read'],
  ];

  private readonly roles = [
    // Live uppercase app roles (mirrors ANALYTICS_READ_ROLES in the controller)
    'ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SERVICE',
    // Legacy lowercase system roles
    'admin', 'manager', 'viewer',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [resource, action] of this.perms) {
      await queryRunner.query(
        `INSERT INTO permissions (resource, action) VALUES ($1, $2) ON CONFLICT (resource, action) DO NOTHING`,
        [resource, action],
      );
    }
    for (const roleName of this.roles) {
      for (const [resource, action] of this.perms) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id
           FROM roles r, permissions p
           WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
           ON CONFLICT DO NOTHING`,
          [roleName, resource, action],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [resource, action] of this.perms) {
      await queryRunner.query(
        `DELETE FROM role_permissions
         WHERE permission_id = (SELECT id FROM permissions WHERE resource = $1 AND action = $2)`,
        [resource, action],
      );
      await queryRunner.query(
        `DELETE FROM permissions WHERE resource = $1 AND action = $2`,
        [resource, action],
      );
    }
  }
}
