import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { SupplierInspectionService } from '../services/supplier-inspection.service';
import { SupplierInspectionStatus } from '../entities/supplier-inspection.entity';

@ApiTags('quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality/supplier-inspections')
export class SupplierInspectionController {
  constructor(private readonly service: SupplierInspectionService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PURCHASING')
  @Get()
  async findAll(@Query() q: PaginationDto & { status?: SupplierInspectionStatus; supplierId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.findAll(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PURCHASING')
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'PURCHASING')
  @Post()
  async create(@Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id, user.tenantId ?? undefined);
  }
}
