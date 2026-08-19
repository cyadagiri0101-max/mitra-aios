import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EmployeeSkillService } from '../services/employee-skill.service';
import { AssignEmployeeSkillDto, UpdateEmployeeSkillDto } from '../dto/employee-skill.dto';

/**
 * Employee–skill matrix, mounted under /employees/:id/skills.
 * Employee ownership is verified through the tenant-scoped EmployeeService
 * on every request — cross-tenant access is impossible.
 */
@ApiTags('employee-skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees/:id/skills')
export class EmployeeSkillsController {
  constructor(private readonly service: EmployeeSkillService) {}

  @Get()
  @Permissions('employee_skill:read')
  async findByEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findByEmployee(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('employee_skill:assign')
  @Post()
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignEmployeeSkillDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('employee_skill:update')
  @Patch(':skillId')
  async update(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateEmployeeSkillDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, skillId, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('employee_skill:remove')
  @Delete(':skillId')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, skillId, user.id, user.tenantId);
  }
}