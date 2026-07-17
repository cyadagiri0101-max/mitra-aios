import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { PmmImportService } from '../services/pmm-import.service';

class ImportPmmDto {
  tenantId?: string;
}

@ApiTags('tool-master-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tool-master/import')
export class PmmImportController {
  constructor(private readonly service: PmmImportService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Post()
  async importPmm(@Body() _dto: ImportPmmDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.service.importHistoricalPmm(user.tenantId ?? _dto.tenantId ?? undefined as any, user.id);
  }
}
