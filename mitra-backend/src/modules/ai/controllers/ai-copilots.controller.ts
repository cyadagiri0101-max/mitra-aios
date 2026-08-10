import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AI_CHAT_THROTTLE } from '@common/config/throttle.config';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CopilotDomain } from '../dto/copilot.dto';
import { CopilotPlatformChatDto } from '../dto/ai-copilots.dto';
import { EnterpriseCopilotService } from '../services/enterprise-copilot.service';

const INTERNAL_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];

/**
 * Sprint 2.8.3 — Enterprise Copilot APIs.
 *
 * Seven domain copilots (Engineering, Manufacturing, Quality,
 * Commercial, Project, Service, Executive) served through the same
 * capability catalogue. RBAC is enforced downstream by the platform
 * pipeline per capability prompt and tool.
 */
@ApiTags('AI Copilots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/copilots')
export class AiCopilotsController {
  constructor(private readonly copilots: EnterpriseCopilotService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'List the seven enterprise copilots and their capability counts' })
  listCopilots() {
    return { data: this.copilots.listCopilots() };
  }

  @Get(':domain')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'List capabilities of one copilot (prompt key, auto-tools, actions, follow-ups)' })
  listCapabilities(@Param('domain') domain: CopilotDomain) {
    return { data: this.copilots.listCapabilities(domain) };
  }

  @Get(':domain/suggestions')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'Starter suggestions for one copilot' })
  suggestions(@Param('domain') domain: CopilotDomain) {
    return { suggestions: this.copilots.suggestions(domain) };
  }

  @Post(':domain/chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({ summary: 'Chat with a domain copilot — capability detection, auto tools, full platform pipeline' })
  chat(@Param('domain') domain: CopilotDomain, @Body() dto: CopilotPlatformChatDto, @CurrentUser() user: AuthUser) {
    return this.copilots.chat({
      domain,
      message: dto.message,
      task: dto.task,
      capability: dto.capability,
      entityType: dto.entityType,
      entityId: dto.entityId,
      selectedProjectId: dto.selectedProjectId,
      conversationId: dto.conversationId,
      locale: dto.locale,
      model: dto.model,
      tools: dto.tools,
      toolArgs: dto.toolArgs,
      tenantId: user.tenantId ?? 'default',
      userId: user.id,
      userRole: user.role,
    });
  }
}
