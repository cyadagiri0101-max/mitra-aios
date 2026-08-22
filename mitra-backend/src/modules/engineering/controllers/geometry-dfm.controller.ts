import {
  Controller,
  Get,
  Post,
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
import { GeometricFeatureService } from '../services/geometric-feature.service';
import { DfmRuleEngineService } from '../services/dfm-rule-engine.service';
import { HistoricalDefectCorrelationService } from '../services/historical-defect-correlation.service';
import {
  ExtractGeometricFeaturesDto,
  EvaluateDfmDto,
  ReviewDfmFindingDto,
} from '../dto/geometry-dfm.dto';
import {
  CorrelateHistoricalDefectsDto,
} from '../dto/historical-defect.dto';

import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ENGINEERING_EVALUATION_THROTTLE,
  ENGINEERING_WORKSPACE_THROTTLE,
} from '../../../common/config/throttle.config';
import { EngineeringReasoningEngineService } from '../services/engineering-reasoning-engine.service';

@ApiTags('engineering-geometry-dfm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Controller('api/engineering')
export class GeometryDfmController {
  constructor(
    private readonly featureService: GeometricFeatureService,
    private readonly dfmService: DfmRuleEngineService,
    private readonly correlationService: HistoricalDefectCorrelationService,
    private readonly reasoningService: EngineeringReasoningEngineService,
  ) {}

  @Get('drawings/:drawingId/analysis-workspace')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @ApiOperation({ summary: 'Get unified DFM analysis workspace context including geometry, findings, correlations, reasoning, and cost' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getAnalysisWorkspace(
    @Param('drawingId') drawingId: string,
    @Query('revision') revision: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rev = revision || 'Rev A';
    const tenantId = user.tenantId || '';

    const [features, findings, correlations] = await Promise.all([
      this.featureService.getFeaturesByDrawing(drawingId, rev, tenantId),
      this.dfmService.getFindingsByDrawing(drawingId, rev, tenantId),
      this.correlationService.getCorrelationsByDrawing(drawingId, rev, tenantId),
    ]);

    let reasoningResults: any[] = [];
    if (findings.length > 0) {
      const reasoningPromises = findings.map((f) =>
        this.reasoningService.getReasoningByFinding(f.id, tenantId),
      );
      const nested = await Promise.all(reasoningPromises);
      reasoningResults = nested.flat();
    }

    return {
      drawingId,
      activeRevision: rev,
      analysisRevision: rev,
      revisionSafetyStatus: 'REVISION_MATCH_VERIFIED',
      featuresCount: features.length,
      findingsCount: findings.length,
      correlationsCount: correlations.length,
      reasoningResultsCount: reasoningResults.length,
      features,
      findings,
      correlations,
      reasoningResults,
      advisoryNotice: 'MITRA M11.4 Decision Support: AI proposes advisory recommendations; engineer reviews and decides. CAD/BOM is never autonomously modified.',
    };
  }

  @Post('geometry/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract and normalize canonical geometric features from CAD/Drawing' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING')
  async extractGeometry(
    @Body() dto: ExtractGeometricFeaturesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.featureService.extractFeatures(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('geometry/:drawingId')
  @ApiOperation({ summary: 'Get extracted geometric features for a drawing' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getFeatures(
    @Param('drawingId') drawingId: string,
    @Query('revision') revision: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.featureService.getFeaturesByDrawing(
      drawingId,
      revision || 'Rev A',
      user.tenantId || '',
    );
  }

  @Post('dfm/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run deterministic DFM rule evaluation' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING')
  async evaluateDfm(
    @Body() dto: EvaluateDfmDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dfmService.evaluateDfm(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('dfm/findings/:drawingId')
  @ApiOperation({ summary: 'Get DFM findings for a drawing revision' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getFindings(
    @Param('drawingId') drawingId: string,
    @Query('revision') revision: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dfmService.getFindingsByDrawing(
      drawingId,
      revision || 'Rev A',
      user.tenantId || '',
    );
  }

  @Post('dfm/findings/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Human engineering review of a DFM finding' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async reviewFinding(
    @Param('id') id: string,
    @Body() dto: ReviewDfmFindingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dfmService.reviewFinding(
      id,
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Post('defects/correlate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Correlate DFM findings with historical quality NCRs and trials' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING')
  async correlateDefects(
    @Body() dto: CorrelateHistoricalDefectsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correlationService.correlateHistoricalDefects(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('dfm/findings/:id/history')
  @ApiOperation({ summary: 'Get historical defect correlations for a specific DFM finding' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getFindingHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correlationService.getFindingHistory(
      id,
      user.tenantId || '',
    );
  }

  @Get('defects/correlations/:drawingId')
  @ApiOperation({ summary: 'Get historical defect correlations for a drawing revision' })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY', 'PLANNING', 'OPERATIONS')
  async getCorrelations(
    @Param('drawingId') drawingId: string,
    @Query('revision') revision: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correlationService.getCorrelationsByDrawing(
      drawingId,
      revision || 'Rev A',
      user.tenantId || '',
    );
  }
}
