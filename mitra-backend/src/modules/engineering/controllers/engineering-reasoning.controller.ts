import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';
import { EngineeringCostSynthesisService } from '../services/engineering-cost-synthesis.service';
import {
  EvaluateEngineeringReasoningDto,
  ReviewReasoningResultDto,
  CreateCostConfigurationDto,
  UpdateCostConfigurationDto,
  QueryCostConfigurationsDto,
} from '../dto/engineering-reasoning.dto';

import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ENGINEERING_REASONING_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@ApiTags('engineering-reasoning-cost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Controller('api/engineering')
export class EngineeringReasoningController {
  constructor(
    private readonly reasoningService: EngineeringReasoningEngineService,
    private readonly costSynthesisService: EngineeringCostSynthesisService,
  ) {}

  @Post('reasoning/evaluate')
  @Throttle({ default: ENGINEERING_REASONING_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute multi-step engineering reasoning & cost synthesis pipeline' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING')
  async evaluateReasoning(
    @Body() dto: EvaluateEngineeringReasoningDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.evaluateReasoning(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('reasoning/:id')
  @ApiOperation({ summary: 'Get engineering reasoning result by ID' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getReasoningResult(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.getReasoningResultById(
      id,
      user.tenantId || '',
    );
  }

  @Get('reasoning/:id/evidence')
  @ApiOperation({ summary: 'Get evidence chain for an engineering reasoning result' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getEvidence(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.getEvidenceById(
      id,
      user.tenantId || '',
    );
  }

  @Get('reasoning/:id/cost')
  @ApiOperation({ summary: 'Get cost synthesis breakdown for an engineering reasoning result' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getCost(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.getCostById(
      id,
      user.tenantId || '',
    );
  }

  @Get('reasoning/:id/recommendation')
  @ApiOperation({ summary: 'Get explainable engineering recommendation for a reasoning result' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getRecommendation(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.getRecommendationById(
      id,
      user.tenantId || '',
    );
  }

  @Post('reasoning/:id/review')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Human engineering review of reasoning & recommendation (Accept/Modify/Reject/Cancel)' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async reviewReasoning(
    @Param('id') id: string,
    @Body() dto: ReviewReasoningResultDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.reviewReasoningResult(
      id,
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('dfm/findings/:id/reasoning')
  @ApiOperation({ summary: 'Get all reasoning results generated for a specific DFM finding' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getReasoningByFinding(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reasoningService.getReasoningByFinding(
      id,
      user.tenantId || '',
    );
  }

  // Cost Configuration Management Endpoints
  @Post('cost-configurations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create authoritative engineering cost configuration rate' })
  @Roles('ADMIN', 'ENGINEERING', 'FINANCE', 'PLANNING')
  async createCostConfiguration(
    @Body() dto: CreateCostConfigurationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.costSynthesisService.createCostConfiguration(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('cost-configurations')
  @ApiOperation({ summary: 'List and filter authoritative cost configuration rates' })
  @Roles('ADMIN', 'ENGINEERING', 'FINANCE', 'PLANNING', 'OPERATIONS')
  async getCostConfigurations(
    @Query() query: QueryCostConfigurationsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.costSynthesisService.getCostConfigurations(
      query,
      user.tenantId || '',
    );
  }

  @Get('cost-configurations/:id')
  @ApiOperation({ summary: 'Get cost configuration rate by ID' })
  @Roles('ADMIN', 'ENGINEERING', 'FINANCE', 'PLANNING', 'OPERATIONS')
  async getCostConfigurationById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.costSynthesisService.getCostConfigurationById(
      id,
      user.tenantId || '',
    );
  }

  @Put('cost-configurations/:id')
  @ApiOperation({ summary: 'Update cost configuration rate' })
  @Roles('ADMIN', 'ENGINEERING', 'FINANCE', 'PLANNING')
  async updateCostConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateCostConfigurationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.costSynthesisService.updateCostConfiguration(
      id,
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Delete('cost-configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete cost configuration rate' })
  @Roles('ADMIN', 'ENGINEERING', 'FINANCE')
  async deleteCostConfiguration(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.costSynthesisService.deleteCostConfiguration(
      id,
      user.tenantId || '',
      user,
    );
  }
}
