import {
  Controller, Post, Get, Body, UseGuards,
  HttpCode, HttpStatus, Query, Param,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from '../services/ai.service';
import { AiCopilotOrchestratorService } from '../services/ai-copilot-orchestrator.service';
import { AiCopilotMemoryService } from '../services/ai-copilot-memory.service';
import { PromptTemplateService } from '../services/prompt-template.service';
import {
  AiChatDto, AiAnalysisDto,
  AiChatResponseDto, AiHealthResponseDto,
} from '../dto/ai.dto';
import { CopilotChatDto, CopilotContextDto, CopilotDomain, CopilotResponseDto, PromptExecutionDto } from '../dto/copilot.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AI_CHAT_THROTTLE, AI_ANALYZE_THROTTLE } from '@common/config/throttle.config';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

const INTERNAL_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];

@ApiTags('AI Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly copilot: AiCopilotOrchestratorService,
    private readonly memory: AiCopilotMemoryService,
    private readonly promptTemplates: PromptTemplateService,
  ) {}

  /** Ollama availability - used by the UI to show/hide the AI panel */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check AI (Ollama) availability' })
  @ApiResponse({ status: 200, type: AiHealthResponseDto })
  health(): Promise<AiHealthResponseDto> {
    return this.aiService.health();
  }

  /** Backward-compatible legacy chat endpoint. */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({ summary: 'MITRA legacy AI chat grounded in platform context' })
  @ApiResponse({ status: 200, type: AiChatResponseDto })
  chat(@Body() dto: AiChatDto, @CurrentUser() user: AuthUser): Promise<AiChatResponseDto> {
    return this.aiService.chat(dto, user.tenantId ?? 'default', user.id);
  }

  /** Backward-compatible legacy entity analysis endpoint. */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_ANALYZE_THROTTLE })
  @ApiOperation({ summary: 'Analyze a specific MITRA entity' })
  @ApiResponse({ status: 200, type: AiChatResponseDto })
  analyze(@Body() dto: AiAnalysisDto, @CurrentUser() user: AuthUser): Promise<AiChatResponseDto> {
    return this.aiService.analyzeEntity(dto, user.tenantId ?? 'default', user.id);
  }

  @Post('copilot/chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({ summary: 'Enterprise Copilot chat with citations, confidence, and scoped memory' })
  @ApiResponse({ status: 200, type: CopilotResponseDto })
  copilotChat(@Body() dto: CopilotChatDto, @CurrentUser() user: AuthUser) {
    const request = dto.request;
    return this.copilot.orchestrate({
      domain: request.domain ?? CopilotDomain.PROJECT,
      message: request.message,
      task: request.task,
      entityType: request.entityType,
      entityId: request.entityId,
      selectedProjectId: request.selectedProjectId,
      conversationId: dto.conversationId,
      tenantId: user.tenantId ?? 'default',
      userId: user.id,
      userRole: user.role,
    });
  }

  @Post('copilot/context')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_ANALYZE_THROTTLE })
  @ApiOperation({ summary: 'Retrieve permission-aware Copilot context for an entity' })
  retrieveContext(@Body() dto: CopilotContextDto, @CurrentUser() user: AuthUser) {
    return this.copilot.retrieveContext({
      domain: dto.domain ?? CopilotDomain.PROJECT,
      entityType: dto.entityType,
      entityId: dto.entityId,
      query: dto.query,
      tenantId: user.tenantId ?? 'default',
      userRole: user.role,
    });
  }

  @Post('copilot/prompts/execute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({ summary: 'Execute a versioned Copilot prompt template' })
  executePrompt(@Body() dto: PromptExecutionDto, @CurrentUser() user: AuthUser) {
    const request = dto.request;
    return this.copilot.orchestrate({
      domain: request.domain ?? CopilotDomain.PROJECT,
      message: request.message,
      task: dto.task,
      entityType: request.entityType,
      entityId: request.entityId,
      selectedProjectId: request.selectedProjectId,
      conversationId: dto.conversationId,
      tenantId: user.tenantId ?? 'default',
      userId: user.id,
      userRole: user.role,
    });
  }

  @Get('copilot/prompts')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'List reusable versioned Copilot prompt templates' })
  listPrompts(@Query('domain') domain?: string) {
    return this.promptTemplates.listTemplates(domain);
  }

  @Get('copilot/suggestions')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'Generate starter Copilot suggestions for a domain' })
  suggestions(@Query('domain') domain: CopilotDomain = CopilotDomain.PROJECT) {
    const suggestions: Record<CopilotDomain, string[]> = {
      [CopilotDomain.ENGINEERING]: ['Explain this drawing', 'Compare latest revisions', 'Find similar drawings'],
      [CopilotDomain.MANUFACTURING]: ['Summarize production status', 'Explain downtime', 'Review material variance'],
      [CopilotDomain.QUALITY]: ['Summarize open NCRs', 'Explain CAPA status', 'Guide PPAP checklist readiness'],
      [CopilotDomain.SERVICE]: ['Summarize warranty history', 'Find failure patterns', 'Recommend supported spare parts'],
      [CopilotDomain.EXECUTIVE]: ['Create company health briefing', 'Summarize portfolio risk', 'Review quality trends'],
      [CopilotDomain.COMMERCIAL]: ['Summarize RFQ pipeline', 'Explain quotation status', 'Review customer activity'],
      [CopilotDomain.PROJECT]: ['Find similar projects', 'Summarize project status', 'List current project risks'],
    };
    return { domain, suggestions: suggestions[domain] ?? suggestions.project };
  }

  @Get('copilot/conversations')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'List scoped Copilot conversations for current user' })
  listConversations(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.memory.listConversations(user.tenantId ?? 'default', user.id, Number(limit ?? 20));
  }

  @Get('copilot/conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({ summary: 'List scoped messages for one Copilot conversation' })
  conversationMessages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.memory.getConversationMessages(user.tenantId ?? 'default', user.id, id);
  }
}
