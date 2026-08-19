import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { SkillService } from '../services/skill.service';
import { EmployeeService } from '../services/employee.service';
import { CreateSkillDto, UpdateSkillDto } from '../dto/skill.dto';

@ApiTags('skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skills')
export class SkillsController {
  constructor(
    private readonly service: SkillService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Get()
  @Permissions('skill:read')
  async findAll(
    @Query() q: PaginationDto,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.findAll(
      user?.tenantId ?? undefined,
      q.page ?? 1,
      q.limit ?? 20,
      search,
      category,
      status,
    );
  }

  @Get('catalog')
  @Permissions('skill:read')
  async catalog(@CurrentUser() user?: AuthUser) {
    return this.service.findActive(user?.tenantId ?? undefined);
  }

  @Get(':id/employees')
  @Permissions('skill:read')
  async employeesBySkill(
    @Param('id') id: string,
    @Query('code') code?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const skill = await this.service.findOne(id, user?.tenantId ?? undefined);
    const codes = code?.trim() ? [code.trim()] : [skill.code];
    return this.employeeService.findBySkillCodes(codes, user?.tenantId ?? undefined);
  }

  @Get(':id')
  @Permissions('skill:read')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('skill:create')
  @Post()
  async create(@Body() dto: CreateSkillDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('skill:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSkillDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('skill:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}