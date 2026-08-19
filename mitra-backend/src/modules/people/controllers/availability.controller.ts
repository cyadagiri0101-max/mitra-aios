import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { ResourceAvailabilityService } from '../services/resource-availability.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from '../dto/availability.dto';

/**
 * Resource availability, mounted under /employees/:id/availability.
 * Employee ownership is verified through the tenant-scoped EmployeeService
 * on every request — cross-tenant access is impossible.
 */
@ApiTags('availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees/:id/availability')
export class AvailabilityController {
  constructor(private readonly service: ResourceAvailabilityService) {}

  @Get()
  @Permissions('availability:read')
  async findByEmployee(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.findByEmployee(id, from, to, user?.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'DESIGN', 'PRODUCTION', 'QUALITY')
  @Permissions('availability:create')
  @Post()
  async create(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createForEmployee(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'DESIGN', 'PRODUCTION', 'QUALITY')
  @Permissions('availability:update')
  @Patch(':workDate')
  async update(
    @Param('id') id: string,
    @Param('workDate') workDate: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateForEmployee(id, workDate, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('availability:delete')
  @Delete(':workDate')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Param('workDate') workDate: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeForEmployee(id, workDate, user.id, user.tenantId);
  }
}