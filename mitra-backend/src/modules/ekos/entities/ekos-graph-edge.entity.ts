import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EkosGraphNode } from './ekos-graph-node.entity';

export enum EkosRelationType {
  DERIVED_FROM = 'DERIVED_FROM',
  REFERENCES = 'REFERENCES',
  FULFILLS = 'FULFILLS',
  CONSTRAINS = 'CONSTRAINS',
  OBSERVED_IN = 'OBSERVED_IN',
  RESOLVED_BY = 'RESOLVED_BY',
  CITED_BY = 'CITED_BY',
  PREDICTED_FROM = 'PREDICTED_FROM',
}

export enum EkosProvenanceType {
  TRANSACTIONAL_EVENT = 'TRANSACTIONAL_EVENT',
  EXPLICIT_HUMAN = 'EXPLICIT_HUMAN',
  IMPORTED_DATA = 'IMPORTED_DATA',
  AI_INFERRED = 'AI_INFERRED',
}

@Entity('ekos_graph_edges')
@Index('IX_ekos_graph_edges_tenant', ['tenantId'])
@Index('IX_ekos_graph_edges_source', ['tenantId', 'sourceNodeId'])
@Index('IX_ekos_graph_edges_target', ['tenantId', 'targetNodeId'])
@Index('IX_ekos_graph_edges_relation', ['tenantId', 'relationType'])
@Index('IX_ekos_graph_edges_project', ['tenantId', 'projectId'])
export class EkosGraphEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'source_node_id', type: 'uuid' })
  sourceNodeId: string;

  @Column({ name: 'target_node_id', type: 'uuid' })
  targetNodeId: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 100 })
  relationType: EkosRelationType | string;

  @Column({
    name: 'provenance_type',
    type: 'varchar',
    length: 50,
    default: EkosProvenanceType.TRANSACTIONAL_EVENT,
  })
  provenanceType: EkosProvenanceType | string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ type: 'numeric', precision: 5, scale: 4, default: 1.0 })
  confidence: number;

  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, any>;

  @Column({ name: 'is_superseded', type: 'boolean', default: false })
  isSuperseded: boolean;

  @Column({ name: 'valid_from', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => EkosGraphNode, (node) => node.outgoingEdges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_node_id' })
  sourceNode: EkosGraphNode;

  @ManyToOne(() => EkosGraphNode, (node) => node.incomingEdges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_node_id' })
  targetNode: EkosGraphNode;
}
