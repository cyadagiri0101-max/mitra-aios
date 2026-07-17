import { Entity, ManyToOne, JoinColumn, Column, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission extends IndustrialBaseEntity {
  @Column({ name: 'role_id', type: 'uuid' })
  @Index()
  roleId: string;

  @ManyToOne(() => Role, (role) => role.permissions)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'permission_id', type: 'uuid' })
  @Index()
  permissionId: string;

  @ManyToOne(() => Permission, (perm) => perm.rolePermissions)
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}