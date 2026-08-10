import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InstallationService } from '../services/installation.service';
import { WarrantyService, WarrantyClaimService } from '../services/warranty.service';
import { AmcService } from '../services/amc.service';
import { VisitService } from '../services/visit.service';
import { SparePart } from '../entities/sparepart.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInstallationDto, UpdateInstallationDto, CreateWarrantyDto, UpdateWarrantyDto, CreateWarrantyClaimDto, UpdateWarrantyClaimDto, CreateAmcDto, UpdateAmcDto, CreateVisitDto, UpdateVisitDto } from '../dto/service.dto';

@ApiTags('service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service')
export class ServiceLifecycleController {
  constructor(
    private readonly installationService: InstallationService,
    private readonly warrantyService: WarrantyService,
    private readonly warrantyClaimService: WarrantyClaimService,
    private readonly amcService: AmcService,
    private readonly visitService: VisitService,
    @InjectRepository(SparePart)
    private readonly sparePartRepo: Repository<SparePart>,
  ) {}

  @Get('installations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @ApiOperation({ summary: 'List installation records' })
  listInstallations(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.installationService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Post('installations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:create')
  @ApiOperation({ summary: 'Create installation record' })
  createInstallation(@Body() dto: CreateInstallationDto, @CurrentUser() user: AuthUser) {
    return this.installationService.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Patch('installations/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:update')
  @ApiOperation({ summary: 'Update installation record' })
  updateInstallation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInstallationDto, @CurrentUser() user: AuthUser) {
    return this.installationService.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Get('warranty')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'QUALITY')
  @ApiOperation({ summary: 'List warranty records' })
  listWarranty(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.warrantyService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Post('warranty')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:create')
  @ApiOperation({ summary: 'Create warranty record' })
  createWarranty(@Body() dto: CreateWarrantyDto, @CurrentUser() user: AuthUser) {
    return this.warrantyService.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Patch('warranty/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:update')
  @ApiOperation({ summary: 'Update warranty record' })
  updateWarranty(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarrantyDto, @CurrentUser() user: AuthUser) {
    return this.warrantyService.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Get('warranty-claims')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'SERVICE')
  @ApiOperation({ summary: 'List warranty claims' })
  listWarrantyClaims(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.warrantyClaimService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Post('warranty-claims')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:create')
  @ApiOperation({ summary: 'Create warranty claim' })
  createWarrantyClaim(@Body() dto: CreateWarrantyClaimDto, @CurrentUser() user: AuthUser) {
    return this.warrantyClaimService.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Patch('warranty-claims/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  @Permissions('service:update')
  @ApiOperation({ summary: 'Approve a warranty claim' })
  approveWarrantyClaim(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarrantyClaimDto, @CurrentUser() user: AuthUser) {
    return this.warrantyClaimService.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Get('amc')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'SERVICE')
  @ApiOperation({ summary: 'List AMC contracts' })
  listAmc(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.amcService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Post('amc')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:create')
  @ApiOperation({ summary: 'Create AMC contract' })
  createAmc(@Body() dto: CreateAmcDto, @CurrentUser() user: AuthUser) {
    return this.amcService.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Patch('amc/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:update')
  @ApiOperation({ summary: 'Update AMC contract' })
  updateAmc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAmcDto, @CurrentUser() user: AuthUser) {
    return this.amcService.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Get('visits')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @ApiOperation({ summary: 'List service visits' })
  listVisits(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.visitService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Post('visits')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:create')
  @ApiOperation({ summary: 'Create service visit record' })
  createVisit(@Body() dto: CreateVisitDto, @CurrentUser() user: AuthUser) {
    return this.visitService.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Patch('visits/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE')
  @Permissions('service:update')
  @ApiOperation({ summary: 'Update service visit record' })
  updateVisit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVisitDto, @CurrentUser() user: AuthUser) {
    return this.visitService.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId ?? undefined);
  }

  @Get('spare-parts')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SERVICE', 'QUALITY', 'PRODUCTION')
  @ApiOperation({ summary: 'List spare parts catalog' })
  listSpareParts(@Query() q: PaginationDto, @CurrentUser() user: AuthUser) {
    const where = user.tenantId ? { tenantId: user.tenantId } : {};
    return this.sparePartRepo.find({
      where,
      order: { createdAt: 'DESC' },
      skip: ((q.page ?? 1) - 1) * (q.limit ?? 20),
      take: q.limit ?? 20,
    });
  }
}
