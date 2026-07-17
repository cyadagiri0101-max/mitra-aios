import {
  Controller, Post, Get, Body, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AiService } from '../services/ai.service';
import {
  AiChatDto, AiAnalysisDto,
  AiChatResponseDto, AiHealthResponseDto,
} from '../dto/ai.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AI_CHAT_THROTTLE, AI_ANALYZE_THROTTLE } from '@common/config/throttle.config';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('AI Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** Ollama availability — used by the UI to show/hide the AI panel */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check AI (Ollama) availability' })
  @ApiResponse({ status: 200, type: AiHealthResponseDto })
  health(): Promise<AiHealthResponseDto> {
    return this.aiService.health();
  }

  /**
   * Main chat endpoint.
   * Rate-limited: 30 messages per minute per user.
   * When AI_ENABLED=false, returns structured data without LLM.
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Throttle({ default: AI_CHAT_THROTTLE })
  @ApiOperation({
    summary: 'MITRA Copilot — ask anything about your manufacturing data',
    description: `
Fetches live data from MITRA and optionally passes it through a local Ollama LLM.

When \`AI_ENABLED=false\` (default): returns structured DB records without LLM.
When \`AI_ENABLED=true\`: returns an LLM-generated natural language answer grounded in your data.

Example questions:
- "Show me all delayed projects"
- "Which CAPAs have been open for more than 30 days?"
- "Give me a summary of last month's trials"
- "What are the open service requests for customer Acme?"
    `,
  })
  @ApiResponse({ status: 200, type: AiChatResponseDto })
  chat(
    @Body() dto: AiChatDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiChatResponseDto> {
    return this.aiService.chat(dto, user.tenantId ?? 'default', user.id);
  }

  /**
   * Deep analysis of a specific entity (CAPA, Trial, Project, Service request).
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Throttle({ default: AI_ANALYZE_THROTTLE })
  @ApiOperation({
    summary: 'Analyze a specific MITRA entity (CAPA root cause, Trial summary, etc.)',
  })
  @ApiResponse({ status: 200, type: AiChatResponseDto })
  analyze(
    @Body() dto: AiAnalysisDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AiChatResponseDto> {
    return this.aiService.analyzeEntity(dto, user.tenantId ?? 'default', user.id);
  }
}
