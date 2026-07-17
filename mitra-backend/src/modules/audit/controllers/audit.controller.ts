import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGEMENT')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 50);
  }

  @Get('entity/:type/:id')
  async findByEntity(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Scope audit log queries to the requesting user's tenant so MANAGEMENT
    // users from Tenant A cannot read audit logs for entities owned by Tenant B.
    return this.auditService.findByEntity(type, id, user.tenantId ?? undefined);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditService.findByUser(userId, user.tenantId ?? undefined);
  }
}
