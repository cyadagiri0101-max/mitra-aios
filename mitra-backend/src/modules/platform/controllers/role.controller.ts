import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.roleService.findAll(user.tenantId ?? undefined);
  }

  @Get('permissions/all')
  async findAllPermissions(@CurrentUser() user: AuthUser) {
    return this.roleService.findAllPermissions(user.tenantId ?? undefined);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.roleService.findOne(id, user.tenantId ?? undefined);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body() body: CreateRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.roleService.create(body, user.id, user.tenantId ?? undefined);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.roleService.update(id, body, user.id, user.tenantId ?? undefined);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.roleService.remove(id, user.id, user.tenantId ?? undefined);
  }
}
