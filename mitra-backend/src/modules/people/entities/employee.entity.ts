import { Entity, Column, Index } from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Employee / engineer / resource master (M1 Sprint 1 — Vision-100 M2).
 *
 * Master reference data that exists independently of any project and is
 * consumed by planning, capacity, BI and knowledge capabilities. The
 * platform `users` table remains the auth identity source; `userId` links
 * an employee row to its login account when one exists.
 */
@Entity('employees')
@Index(['employeeCode', 'tenantId', 'deletedAt'])
@Index(['status', 'tenantId', 'deletedAt'])
export class Employee extends IndustrialBaseEntity {
  @Column({ name: 'employee_code', type: 'varchar', length: 30 })
  employeeCode: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designation: string | null;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;
}