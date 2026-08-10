import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum ImpactType {
  DRAWING = 'DRAWING',
  BOM = 'BOM',
  PROJECT = 'PROJECT',
  WORK_ORDER = 'WORK_ORDER',
  ROUTING = 'ROUTING',
  MATERIAL = 'MATERIAL',
  COMPONENT = 'COMPONENT',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

export enum ImpactSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ImpactDisposition {
  RETAIN = 'RETAIN',
  REVISE = 'REVISE',
  REPLACE = 'REPLACE',
  OBSOLETE = 'OBSOLETE',
}

/**
 * Impact analysis entry for an ECR — identifies affected drawings, BOMs,
 * projects, manufacturing orders, routings, materials and components with a
 * severity and disposition. Sprint 2.3.
 */
@Entity('engineering_change_impacts')
@Index(['ecrId', 'deletedAt'])
@Index(['impactType', 'entityId', 'deletedAt'])
export class EngineeringChangeImpact extends IndustrialBaseEntity {
  @Column({ name: 'ecr_id', type: 'uuid' })
  @Index()
  ecrId: string;

  @Column({ name: 'impact_type', type: 'varchar', length: 30 })
  impactType: ImpactType;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'entity_number', type: 'varchar', length: 100, nullable: true })
  entityNumber: string | null;

  @Column({ name: 'impact_description', type: 'text', nullable: true })
  impactDescription: string | null;

  @Column({ type: 'varchar', length: 20, default: ImpactSeverity.MEDIUM })
  severity: ImpactSeverity;

  @Column({ type: 'varchar', length: 30, default: ImpactDisposition.RETAIN })
  disposition: ImpactDisposition;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;
}
