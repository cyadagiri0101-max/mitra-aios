import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommercialDomainForeignKeys1700000000009 implements MigrationInterface {
  name = 'CommercialDomainForeignKeys1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_contacts_customer') THEN
          ALTER TABLE "contacts"
            ADD CONSTRAINT "FK_contacts_customer"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quotations_enquiry') THEN
          ALTER TABLE "quotations"
            ADD CONSTRAINT "FK_quotations_enquiry"
            FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_quotation_items_quotation') THEN
          ALTER TABLE "quotation_items"
            ADD CONSTRAINT "FK_quotation_items_quotation"
            FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_quotations_project_id" ON "quotations" ("project_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_customer"`);
    await queryRunner.query(`ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "FK_quotations_enquiry"`);
    await queryRunner.query(`ALTER TABLE "quotation_items" DROP CONSTRAINT IF EXISTS "FK_quotation_items_quotation"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quotations_project_id"`);
  }
}
