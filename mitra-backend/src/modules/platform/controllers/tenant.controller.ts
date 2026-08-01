import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

/**
 * Tenant management — ADMIN-only.
 *
 * Tenants are root-level entities (no parent tenant_id), so they are NOT
 * subject to cross-tenant IDOR rules. All mutations require the ADMIN role
 * and the actor's userId is recorded for audit trails.
 */
@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findOne(id);
  }

  @Post()
  async create(
    @Body() body: CreateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantService.create(body, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantService.update(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenantService.remove(id, user.id);
  }
}
