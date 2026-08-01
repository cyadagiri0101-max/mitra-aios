import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SecurityRemediation — Sprint 2.1.1 (C-1 remediation)
 *
 * Introduces the `user:assign_role` permission and grants it to the
 * administrator roles in BOTH role systems (legacy lowercase 'admin' seeded
 * by migration 0010, and the live uppercase 'ADMIN' seeded at runtime).
 * Role assignment endpoints (POST /users/:id/assign-role) require this
 * permission in addition to the ADMIN role.
 */
export class SecurityRemediation1700000000013 implements MigrationInterface {
  name = 'SecurityRemediation1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the permission (idempotent)
    await queryRunner.query(`
      INSERT INTO permissions (resource, action, created_at, updated_at)
      VALUES ('user', 'assign_role', now(), now())
      ON CONFLICT (resource, action) DO NOTHING
    `);

    // 2. Grant to administrator roles (both naming systems, idempotent)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name IN ('ADMIN', 'admin')
        AND p.resource = 'user' AND p.action = 'assign_role'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id = (
        SELECT id FROM permissions WHERE resource = 'user' AND action = 'assign_role'
      )
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource = 'user' AND action = 'assign_role'
    `);
  }
}
