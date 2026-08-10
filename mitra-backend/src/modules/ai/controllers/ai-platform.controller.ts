import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post,
  Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AI_CHAT_THROTTLE, AI_ANALYZE_THROTTLE } from '@common/config/throttle.config';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AiAuditService } from '../services/ai-audit.service';
import { AiOrchestratorService } from '../services/ai-orchestrator.service';
import { ConversationManagerService } from '../services/conversation-manager.service';
import { ModelRouterService } from '../services/model-router.service';
import { PromptRegistryService } from '../services/prompt-registry.service';
import { ToolRegistryService } from '../services/tool-registry.service';
import {
  AiAuditListDto, AiConversationListDto, AiConversationPinDto,
  AiPlatformChatDto, AiPlatformContextDto, AiPromptCreateDto,
  AiPromptListDto, AiPromptUpdateDto, AiToolExecuteDto,
} from '../dto/ai-platform.dto';

const INTERNAL_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];

/**
 * Sprint 2.8.2 Phase 7 — AI platform APIs.
 *
 * Additive surface alongside the legacy AiController: existing
 * /ai/chat, /ai/analyze and /ai/copilot/* routes remain untouched.
 * The new orchestrated chat lives at POST /ai/platform/chat.
 */
@ApiTags('AI Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiPlatformController {
  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly modelRouter: ModelRouterService,
    private readonly conversations: ConversationManagerService,
    private readonly audit: AiAuditService,
  ) {}

  @Post('platform/chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({ summary: 'Platform AI chat — full pipeline (security, tools, registry, router, audit)' })
  chat(@Body() dto: AiPlatformChatDto, @CurrentUser() user: AuthUser) {
    return this.orchestrator.chat({
      domain: dto.domain,
      message: dto.message,
      task: dto.task,
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

  @Post('context')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_ANALYZE_THROTTLE })
  @ApiOperation({ summary: 'Retrieve permission-aware AI context for an entity' })
  context(@Body() dto: AiPlatformContextDto, @CurrentUser() user: AuthUser) {
    return this.orchestrator.retrieveContext({
      domain: dto.domain,
      entityType: dto.entityType,
      entityId: dto.entityId,
      query: dto.query,
      tenantId: user.tenantId ?? 'default',
      userRole: user.role,
    });
  }

  @Get('prompts')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:prompt:read')
  @ApiOperation({ summary: 'List prompt registry templates (versioned, localized, filterable)' })
  listPrompts(@Query() query: AiPromptListDto) {
    return this.promptRegistry.list(query);
  }

  @Post('prompts')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('ai:prompt:write')
  @ApiOperation({ summary: 'Create a draft prompt template' })
  createPrompt(@Body() dto: AiPromptCreateDto, @CurrentUser() user: AuthUser) {
    return this.promptRegistry.create(dto, user.id);
  }

  @Patch('prompts/:id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('ai:prompt:write')
  @ApiOperation({ summary: 'Edit a DRAFT prompt template' })
  updatePrompt(@Param('id') id: string, @Body() dto: AiPromptUpdateDto, @CurrentUser() user: AuthUser) {
    return this.promptRegistry.update(id, dto, user.id);
  }

  @Post('prompts/:id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('ai:prompt:approve')
  @ApiOperation({ summary: 'Approve and publish a draft prompt template' })
  publishPrompt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.promptRegistry.publish(id, user.id);
  }

  @Get('tools')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:tool:read')
  @ApiOperation({ summary: 'List registered AI domain tools' })
  listTools(@Query('domain') domain?: string) {
    return this.toolRegistry.listTools(domain);
  }

  @Post('tools/execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:tool:execute')
  @Throttle({ default: AI_ANALYZE_THROTTLE })
  @ApiOperation({ summary: 'Execute a registered AI domain tool (read-only, permission-checked)' })
  async executeTool(@Body() dto: AiToolExecuteDto, @CurrentUser() user: AuthUser) {
    const result = await this.toolRegistry.execute(dto.name, dto.args ?? {}, {
      tenantId: user.tenantId ?? 'default',
      userId: user.id,
      userRole: user.role,
    });
    await this.audit.record({
      tenantId: user.tenantId ?? 'default',
      userId: user.id,
      userRole: user.role,
      action: 'tool.execute',
      domain: result.domain,
      task: result.tool,
      toolsExecuted: [result.tool],
      processingMs: result.durationMs,
      status: 'SUCCESS',
    });
    return result;
  }

  @Get('models')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:model:read')
  @ApiOperation({ summary: 'List AI models available across registered providers' })
  async listModels() {
    return { models: await this.modelRouter.listModels(), chain: this.modelRouter.chainOrder() };
  }

  @Get('conversations')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:conversation:read')
  @ApiOperation({ summary: 'List AI conversations with expiry information' })
  listConversations(@CurrentUser() user: AuthUser, @Query() query: AiConversationListDto) {
    return this.conversations.list(user.tenantId ?? 'default', user.id, query);
  }

  @Post('conversations/pin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(...INTERNAL_ROLES)
  @Permissions('ai:conversation:pin')
  @ApiOperation({ summary: 'Pin or unpin an AI conversation (pinned conversations are exempt from retention pruning)' })
  pinConversation(@Body() dto: AiConversationPinDto, @CurrentUser() user: AuthUser) {
    const tenantId = user.tenantId ?? 'default';
    return dto.pinned === false
      ? this.conversations.unpin(tenantId, user.id, dto.conversationId)
      : this.conversations.pin(tenantId, user.id, dto.conversationId, dto.reason);
  }

  @Get('audit')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('ai:audit:read')
  @ApiOperation({ summary: 'Query the AI audit trail (ADMIN/MANAGEMENT only)' })
  listAudit(@CurrentUser() user: AuthUser, @Query() query: AiAuditListDto) {
    return this.audit.list({ tenantId: user.tenantId ?? 'default', ...query });
  }

  @Public()
  @Get('platform/health')
  @ApiOperation({ summary: 'AI platform readiness probe (providers, registry, tools)' })
  async platformHealth() {
    return {
      providers: this.modelRouter.providerIds(),
      chain: this.modelRouter.chainOrder(),
      models: await this.modelRouter.listModels(),
      tools: this.toolRegistry.listTools().length,
    };
  }
}
