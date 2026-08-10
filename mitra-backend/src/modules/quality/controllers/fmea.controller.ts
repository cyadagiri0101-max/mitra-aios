import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { FmeaService } from '../services/fmea.service';
import { FmeaStatus } from '../entities/fmea.entity';

@ApiTags('quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality/fmeas')
export class FmeaController {
  constructor(private readonly service: FmeaService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  @Get()
  async findAll(@Query() q: PaginationDto & { status?: FmeaStatus; projectId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.findAll(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  @Post()
  async create(@Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user.id, user.tenantId ?? undefined);
  }
}
