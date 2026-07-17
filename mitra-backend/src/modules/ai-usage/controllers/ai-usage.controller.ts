import {
  Controller, Post, Get, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { AiUsageService } from '../services/ai-usage.service';
import { AiUsageDto, AiUsageSummaryDto } from '../dto/ai-usage.dto';
import { AiUsageRecord } from '../entities/ai-usage-record.entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('AI Usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-usage')
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiOperation({ summary: 'Track an AI usage event (called internally by AI service)' })
  @ApiResponse({ status: 200, type: AiUsageRecord })
  async track(
    @Body() dto: AiUsageDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiUsageRecord> {
    return this.aiUsageService.trackUsage({ ...dto, tenantId: user.tenantId ?? undefined });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get aggregate AI usage statistics' })
  @ApiResponse({ status: 200, type: AiUsageSummaryDto })
  async getStats(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
  ): Promise<AiUsageSummaryDto> {
    return this.aiUsageService.getStats(user.tenantId ?? undefined, days ? parseInt(days, 10) : 7);
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get AI usage for a specific user' })
  @ApiResponse({ status: 200, type: AiUsageSummaryDto })
  async getUserStats(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
  ): Promise<AiUsageSummaryDto> {
    return this.aiUsageService.getUserUsage(userId, user.tenantId ?? undefined, days ? parseInt(days, 10) : 30);
  }
}
