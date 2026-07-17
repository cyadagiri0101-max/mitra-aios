import { Entity, Column, OneToMany, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];
}