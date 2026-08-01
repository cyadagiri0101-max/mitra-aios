import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { ToolMasterService } from '../services/tool-master.service';
import { CreateToolMasterDto, UpdateToolMasterDto } from '../dto/tool-master.dto';

@ApiTags('tool-master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tool-master')
export class ToolMasterController {
  constructor(private readonly service: ToolMasterService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto,
    @Query('search') search?: string,
    @Query('toolType') toolType?: string,
    @Query('toolNo') toolNo?: string,
    @Query('projectName') projectName?: string,
    @Query('customerName') customerName?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const effectiveSearch = search ?? toolNo ?? projectName;
    return this.service.findAll(
      user?.tenantId ?? undefined,
      q.page ?? 1,
      q.limit ?? 20,
      effectiveSearch,
      toolType,
      status,
      toolNo,
      projectName,
      customerName,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id/engineering-context')
  async getEngineeringContext(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getEngineeringContext(id, user.tenantId ?? undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('tool-master:create')
  @Post()
  async create(@Body() dto: CreateToolMasterDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Permissions('tool-master:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateToolMasterDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto as Record<string, any>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('tool-master:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
