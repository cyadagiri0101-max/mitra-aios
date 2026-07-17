import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupplierProductMasters1700000000005 implements MigrationInterface {
  name = 'SupplierProductMasters1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by uuid,
        updated_by uuid,
        tenant_id uuid,
        supplier_code varchar(30) NOT NULL UNIQUE,
        name varchar(200) NOT NULL,
        contact_person varchar(100),
        email varchar(200),
        phone varchar(30),
        website varchar(255),
        address text,
        rating int NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE'
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status) WHERE deleted_at IS NULL;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by uuid,
        updated_by uuid,
        tenant_id uuid,
        product_code varchar(30) NOT NULL UNIQUE,
        name varchar(200) NOT NULL,
        description text,
        category varchar(100),
        supplier_id uuid,
        supplier_name varchar(200),
        unit_price numeric(18,2),
        status varchar(20) NOT NULL DEFAULT 'ACTIVE'
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS products CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS suppliers CASCADE;`);
  }
}
