import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { EkosGraphEdge } from './ekos-graph-edge.entity';

export enum EkosEntityType {
  CUSTOMER = 'CUSTOMER',
  RFQ = 'RFQ',
  QUOTATION = 'QUOTATION',
  PROJECT = 'PROJECT',
  MILESTONE = 'MILESTONE',
  TASK = 'TASK',
  CAD_MODEL = 'CAD_MODEL',
  DRAWING = 'DRAWING',
  BOM = 'BOM',
  BOM_ITEM = 'BOM_ITEM',
  PROCESS_PLAN = 'PROCESS_PLAN',
  WORK_ORDER = 'WORK_ORDER',
  MACHINE = 'MACHINE',
  TRIAL_OBSERVATION = 'TRIAL_OBSERVATION',
  INSPECTION_PLAN = 'INSPECTION_PLAN',
  NCR = 'NCR',
  CAPA = 'CAPA',
  TOOL_MASTER = 'TOOL_MASTER',
  SERVICE_LOG = 'SERVICE_LOG',
  KNOWLEDGE_ARTICLE = 'KNOWLEDGE_ARTICLE',
  EKL_DOCUMENT = 'EKL_DOCUMENT',
  PREDICTIVE_MODEL = 'PREDICTIVE_MODEL',
  LEVELING_RECOMMENDATION = 'LEVELING_RECOMMENDATION',
}

@Entity('ekos_graph_nodes')
@Index('IX_ekos_graph_nodes_tenant', ['tenantId'])
@Index('IX_ekos_graph_nodes_tenant_type', ['tenantId', 'entityType'])
@Index('IX_ekos_graph_nodes_tenant_project', ['tenantId', 'projectId'])
export class EkosGraphNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: EkosEntityType | string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'entity_revision', type: 'varchar', length: 50, nullable: true })
  entityRevision?: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'provenance_source', type: 'varchar', length: 100, default: 'SYSTEM' })
  provenanceSource: string;

  @Column({ name: 'provenance_hash', type: 'varchar', length: 64, nullable: true })
  provenanceHash?: string;

  @Column({ name: 'valid_from', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo?: Date;

  @Column({ name: 'is_superseded', type: 'boolean', default: false })
  isSuperseded: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => EkosGraphEdge, (edge) => edge.sourceNode)
  outgoingEdges: EkosGraphEdge[];

  @OneToMany(() => EkosGraphEdge, (edge) => edge.targetNode)
  incomingEdges: EkosGraphEdge[];
}
