import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuditModule } from '@modules/audit/audit.module';

import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';
import { RoleAssignmentService } from './services/role-assignment.service';
import { NotificationService } from './services/notification.service';
import { TenantService } from './services/tenant.service';

import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { RoleController } from './controllers/role.controller';
import { TenantController } from './controllers/tenant.controller';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationQueue } from './entities/notification-queue.entity';
import { SystemSettings } from './entities/system-settings.entity';

import { JwtStrategy } from '@common/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: (() => {
          const s = configService.get<string>('JWT_SECRET');
          if (!s) throw new Error('[MITRA] JWT_SECRET is required. Run: openssl rand -hex 32');
          return s;
        })(),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION', '15m') as '15m' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User, Role, Permission, RolePermission,
      Tenant, Company, NotificationTemplate, NotificationQueue, SystemSettings,
    ]),
  ],
  controllers: [AuthController, UserController, RoleController, TenantController],
  providers: [AuthService, UserService, RoleService, RoleAssignmentService, NotificationService, TenantService, JwtStrategy],
  exports: [AuthService, UserService, RoleService, RoleAssignmentService, NotificationService, TenantService, JwtModule, TypeOrmModule],
})
export class PlatformModule {}
