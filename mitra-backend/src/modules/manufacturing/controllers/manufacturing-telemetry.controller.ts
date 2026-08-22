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
import { ManufacturingTelemetryService } from '../services/manufacturing-telemetry.service';
import { OperationalClosedLoopService } from '../services/operational-closed-loop.service';
import {
  IngestSignalDto,
  BatchIngestSignalDto,
  CreateObservationDto,
  ReviewRecommendationDto,
} from '../dto/manufacturing-telemetry.dto';

@ApiTags('manufacturing-telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/manufacturing')
export class ManufacturingTelemetryController {
  constructor(
    private readonly telemetryService: ManufacturingTelemetryService,
    private readonly closedLoopService: OperationalClosedLoopService,
  ) {}

  @Post('telemetry/ingest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest normalized machine or operator telemetry signal' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'QUALITY')
  async ingestSignal(
    @Body() dto: IngestSignalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.telemetryService.ingestSignal(dto, user.tenantId || '');
  }

  @Post('telemetry/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch ingest manufacturing telemetry signals' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING')
  async batchIngest(
    @Body() dto: BatchIngestSignalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.telemetryService.batchIngest(dto, user.tenantId || '');
  }

  @Get('telemetry/:machineId')
  @ApiOperation({ summary: 'Get recent telemetry signals for a machine center' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getSignalsByMachine(
    @Param('machineId') machineId: string,
    @Query('limit') limit: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.telemetryService.getSignalsByMachine(
      machineId,
      user.tenantId || '',
      limit ? Number(limit) : 50,
    );
  }

  @Post('observations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a shop-floor operator observation with EKOS lineage' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'QUALITY')
  async createObservation(
    @Body() dto: CreateObservationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.telemetryService.createObservation(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get('work-orders/:workOrderId/feedback')
  @ApiOperation({ summary: 'Get manufacturing signals and observations for a work order' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getFeedbackByWorkOrder(
    @Param('workOrderId') workOrderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.telemetryService.getFeedbackByWorkOrder(
      workOrderId,
      user.tenantId || '',
    );
  }

  @Get('closed-loop/state')
  @ApiOperation({ summary: 'Get current operational state summary with cycle-time variance' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING', 'QUALITY', 'MANAGEMENT')
  async getOperationalState(
    @Query('machineId') machineId: string,
    @Query('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.closedLoopService.getOperationalState(
      user.tenantId || '',
      machineId,
      projectId,
    );
  }

  @Post('closed-loop/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate shop-floor signals and produce advisory operational recommendations' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING')
  async evaluateAnomalies(
    @Query('machineId') machineId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.closedLoopService.evaluateAnomaliesAndRecommend(
      user.tenantId || '',
      machineId,
    );
  }

  @Get('closed-loop/recommendations')
  @ApiOperation({ summary: 'List operational recommendations with multi-tenant filtering' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING', 'MANAGEMENT')
  async getRecommendations(
    @Query('status') status: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.closedLoopService.getRecommendations(
      user.tenantId || '',
      status,
    );
  }

  @Post('closed-loop/recommendations/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Govern human review and approval for an operational recommendation' })
  @Roles('ADMIN', 'OPERATIONS', 'ENGINEERING', 'PLANNING', 'MANAGEMENT')
  async reviewRecommendation(
    @Param('id') id: string,
    @Body() dto: ReviewRecommendationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.closedLoopService.reviewRecommendation(
      id,
      dto,
      user.tenantId || '',
      user,
    );
  }
}
