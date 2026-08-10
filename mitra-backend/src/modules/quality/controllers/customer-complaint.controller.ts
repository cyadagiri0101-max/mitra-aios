import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CustomerComplaintService } from '../services/customer-complaint.service';
import { ComplaintStatus } from '../entities/customer-complaint.entity';

@ApiTags('quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality/customer-complaints')
export class CustomerComplaintController {
  constructor(private readonly service: CustomerComplaintService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'SALES')
  @Get()
  async findAll(@Query() q: PaginationDto & { status?: ComplaintStatus; projectId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.findAll(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'SALES')
  @Post()
  async create(@Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'SALES')
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user.id, user.tenantId ?? undefined);
  }
}
