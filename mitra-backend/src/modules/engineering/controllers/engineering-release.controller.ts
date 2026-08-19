import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import {
  EngineeringReleaseService,
  EngineeringEntityType,
} from '../services/engineering-release.service';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/releases')
export class EngineeringReleaseController {
  constructor(private readonly releaseService: EngineeringReleaseService) {}

  @Get(':entityType/:entityId')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:drawing:read')
  @ApiOperation({ summary: 'Get release status and manufacturing readiness certificate' })
  async getReleaseStatus(
    @Param('entityType') entityType: EngineeringEntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.releaseService.getReleaseStatus(entityType, entityId, user.tenantId);
  }

  @Post(':entityType/:entityId/freeze')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:release_freeze')
  @ApiOperation({ summary: 'Freeze engineering design artifact before formal release' })
  async freezeArtifact(
    @Param('entityType') entityType: EngineeringEntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.releaseService.freezeArtifact(
      entityType,
      entityId,
      body.notes,
      user.id,
      user.tenantId,
    );
  }

  @Post(':entityType/:entityId/release')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:release_approve')
  @ApiOperation({ summary: 'Formally release engineering drawing, BOM, or routing' })
  async releaseArtifact(
    @Param('entityType') entityType: EngineeringEntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.releaseService.releaseArtifact(
      entityType,
      entityId,
      body.notes,
      user.id,
      user.tenantId,
    );
  }
}
