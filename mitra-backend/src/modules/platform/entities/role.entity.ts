import { Entity, Column, OneToMany, Index} from 'typeorm';
import { IndustrialBaseEntity } from '@common/entities/industrial-base.entity';
import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role extends IndustrialBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => RolePermission, (rp) => rp.role)
  permissions: RolePermission[];
}