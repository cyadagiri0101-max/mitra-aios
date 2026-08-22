import { MigrationInterface, QueryRunner } from 'typeorm';

export class M10EkosTraceabilityGraph1700000000051 implements MigrationInterface {
  name = 'M10EkosTraceabilityGraph1700000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekos_graph_nodes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "entity_revision" character varying(50),
        "project_id" uuid,
        "label" character varying(255) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "provenance_source" character varying(100) NOT NULL DEFAULT 'SYSTEM',
        "provenance_hash" character varying(64),
        "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "valid_to" TIMESTAMP WITH TIME ZONE,
        "is_superseded" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ekos_graph_nodes_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_nodes_tenant" ON "ekos_graph_nodes" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_nodes_tenant_type" ON "ekos_graph_nodes" ("tenant_id", "entity_type");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_nodes_tenant_project" ON "ekos_graph_nodes" ("tenant_id", "project_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ekos_graph_nodes_identity" ON "ekos_graph_nodes" ("tenant_id", "entity_type", "entity_id", COALESCE("entity_revision", ''));
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekos_graph_edges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "source_node_id" uuid NOT NULL,
        "target_node_id" uuid NOT NULL,
        "relation_type" character varying(100) NOT NULL,
        "provenance_type" character varying(50) NOT NULL DEFAULT 'TRANSACTIONAL_EVENT',
        "project_id" uuid,
        "confidence" numeric(5, 4) NOT NULL DEFAULT 1.0000,
        "properties" jsonb NOT NULL DEFAULT '{}',
        "is_superseded" boolean NOT NULL DEFAULT false,
        "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "valid_to" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ekos_graph_edges_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ekos_graph_edges_source" FOREIGN KEY ("source_node_id") REFERENCES "ekos_graph_nodes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ekos_graph_edges_target" FOREIGN KEY ("target_node_id") REFERENCES "ekos_graph_nodes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_edges_tenant" ON "ekos_graph_edges" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_edges_source" ON "ekos_graph_edges" ("tenant_id", "source_node_id");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_edges_target" ON "ekos_graph_edges" ("tenant_id", "target_node_id");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_edges_relation" ON "ekos_graph_edges" ("tenant_id", "relation_type");
      CREATE INDEX IF NOT EXISTS "IX_ekos_graph_edges_project" ON "ekos_graph_edges" ("tenant_id", "project_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ekos_graph_edges_unique" ON "ekos_graph_edges" ("tenant_id", "source_node_id", "target_node_id", "relation_type", "is_superseded");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ekos_graph_edges";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ekos_graph_nodes";`);
  }
}
