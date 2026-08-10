import { Controller, Get, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringAiHooksService } from '../services/engineering-ai-hooks.service';
import { AiHookUpdateDto } from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('engineering/ai-hooks')
export class EngineeringAiHooksController {
  constructor(private readonly service: EngineeringAiHooksService) {}

  @Get()
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:aihook:read')
  @ApiOperation({ summary: 'List AI readiness hooks (registry only — no inference executed)' })
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId, Number(page) || 1, Number(limit) || 50);
  }

  @Get(':id')
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:aihook:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:aihook:update')
  @ApiOperation({ summary: 'Enable/disable or reconfigure an AI hook' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiHookUpdateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }
}
