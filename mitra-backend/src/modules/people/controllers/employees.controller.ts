import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeeService) {}

  @Get()
  @Permissions('employee:read')
  async findAll(
    @Query() q: PaginationDto,
    @Query('search') search?: string,
    @Query('skill') skill?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.findAll(
      user?.tenantId ?? undefined,
      q.page ?? 1,
      q.limit ?? 20,
      search,
      skill,
      status,
    );
  }

  @Get('catalog')
  @Permissions('employee:read')
  async catalog(@CurrentUser() user?: AuthUser) {
    return this.service.findActive(user?.tenantId ?? undefined);
  }

  @Get(':id')
  @Permissions('employee:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES', 'SERVICE')
  @Permissions('employee:create')
  @Post()
  async create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'SALES', 'SERVICE')
  @Permissions('employee:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('employee:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}