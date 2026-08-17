import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe, Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringBomService } from '../services/engineering-bom.service';
import {
  CreateBomDto, AddBomItemDto, UpdateBomItemDto, BomRevisionDto, AddSubstitutionDto, UpdateSubstitutionDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/boms')
export class EngineeringBomController {
  constructor(private readonly service: EngineeringBomService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  @ApiOperation({ summary: 'List BOMs (pagination, filtering, search)' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAllAdvanced(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/items')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  @ApiOperation({ summary: 'List BOM items (optional effectiveOn = G-2 effectivity filter)' })
  async listItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('effectiveOn') effectiveOn: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (effectiveOn) return this.service.listItemsEffective(id, effectiveOn, user.tenantId);
    return this.service.listItems(id, user.tenantId);
  }

  @Get(':id/tree')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  @ApiOperation({ summary: 'Multilevel BOM tree with computed quantities' })
  async getTree(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getTree(id, user.tenantId);
  }

  @Get(':id/cost')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:rollup')
  async rollupCost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.rollupCost(id, user.tenantId);
  }

  @Get(':id/cost-rollup')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:rollup')
  @ApiOperation({ summary: 'Parametric Tooling Cost Estimation Engine breakdown' })
  async getParametricCostRollup(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.calculateParametricCostRollup(id, user.tenantId);
  }

  @Get(':id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  async listRevisions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listRevisions(id, user.tenantId);
  }

  @Get(':id/compare/:revisionA/:revisionB')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:compare')
  async compareRevisions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionA') revisionA: string,
    @Param('revisionB') revisionB: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.compareRevisions(id, revisionA, revisionB, user.tenantId);
  }

  @Get(':id/export')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="bom.csv"')
  async exportCsv(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.exportCsv(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:create')
  @ApiOperation({ summary: 'Create BOM (number auto-generated BOM-YYYY-####)' })
  async create(@Body() dto: CreateBomDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, body, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:bom:delete')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post(':id/items')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  async addItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddBomItemDto, @CurrentUser() user: AuthUser) {
    return this.service.addItem(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateBomItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateItem(id, itemId, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  @HttpCode(204)
  async removeItem(@Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string, @CurrentUser() user: AuthUser) {
    return this.service.removeItem(id, itemId, user.id, user.tenantId);
  }

  @Post(':id/revisions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  @ApiOperation({ summary: 'Snapshot BOM into a new revision' })
  async createRevision(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BomRevisionDto, @CurrentUser() user: AuthUser) {
    return this.service.createRevision(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Post(':id/clone')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:update')
  async clone(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.clone(id, body, user.id, user.tenantId);
  }

  @Post(':id/import')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:import')
  @HttpCode(200)
  async importCsv(@Param('id', ParseUUIDPipe) id: string, @Body() body: { csv: string }, @CurrentUser() user: AuthUser) {
    return this.service.importCsv(id, body.csv, user.id, user.tenantId);
  }

  // ── Substitutions (Sprint 2.3.1 G-3) ─────────────────────────────────────

  @Get(':id/substitutions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:bom:read')
  @ApiOperation({ summary: 'List BOM substitutions (itemId/status/asOf filters)' })
  async listSubstitutions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('itemId') itemId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('asOf') asOf: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listSubstitutions(id, { itemId, status, asOf }, user.tenantId);
  }

  @Post(':id/items/:itemId/substitutions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:substitute')
  @ApiOperation({ summary: 'Register a substitute/alternate for a BOM item (effectivity + priority)' })
  async addSubstitution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AddSubstitutionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addSubstitution(id, itemId, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id/items/:itemId/substitutions/:substitutionId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:substitute')
  async updateSubstitution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Param('substitutionId', ParseUUIDPipe) substitutionId: string,
    @Body() dto: UpdateSubstitutionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateSubstitution(id, itemId, substitutionId, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Delete(':id/items/:itemId/substitutions/:substitutionId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:bom:substitute')
  @HttpCode(204)
  async removeSubstitution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Param('substitutionId', ParseUUIDPipe) substitutionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeSubstitution(id, itemId, substitutionId, user.id, user.tenantId);
  }
}
