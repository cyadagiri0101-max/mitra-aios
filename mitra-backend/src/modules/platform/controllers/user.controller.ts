import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.userService.findAll(user.tenantId ?? undefined, page, limit);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.findOne(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  async create(
    @Body() body: CreateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    // FIX H-3: Force the new user's tenantId from the JWT payload, never
    // from the client-supplied request body. Without this, an ADMIN from
    // Tenant-A can POST { tenantId: "tenant-b-uuid" } to plant a user
    // in a different tenant, breaking multi-tenant isolation.
    return this.userService.create(body, user.id, user.tenantId);
  }

  /**
   * Profile update — ADMIN/MANAGEMENT only.
   *
   * SECURITY (C-1 remediation): this endpoint can NEVER change a user's role.
   * `roleId` is stripped from UpdateUserDto and is also ignored by
   * UserService.update. Role changes go exclusively through
   * POST /users/:id/assign-role (ADMIN + user:assign_role required).
   */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.update(id, body, user.id, user.tenantId);
  }

  /**
   * Dedicated role-assignment endpoint (C-1 remediation).
   * ADMIN role AND `user:assign_role` permission required.
   */
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN')
  @Permissions('user:assign_role')
  @Post(':id/assign-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a role to a user — System Administrator only' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignUserRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.roleAssignmentService.assignRole(id, body.roleId, user, body.reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.userService.remove(id, user.id, user.tenantId);
  }
}
