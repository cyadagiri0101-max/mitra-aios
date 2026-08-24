import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TrackingSheetCopilotService } from '../services/tracking-sheet-copilot.service';
import {
  ImportTrackingSheetDto,
  QueryStatusCopilotDto,
} from '../dto/tracking-sheet-copilot.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/tracking-copilot')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class TrackingSheetCopilotController {
  constructor(
    private readonly copilotService: TrackingSheetCopilotService,
  ) {}

  @Post('tracking-sheet/import')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async importTrackingSheet(
    @Body() dto: ImportTrackingSheetDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.importTrackingSheet(dto, tenantId, req.user);
  }

  @Get('tracking-sheet/:projectId/reconciliation')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async reconcileProjectTracking(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.reconcileProjectTracking(projectId, tenantId);
  }

  @Get('project/:projectId/pending')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getProjectPendingWork(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getProjectPendingWork(projectId, tenantId);
  }

  @Post('status-query')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY', 'COMMERCIAL')
  async queryProjectStatusCopilot(
    @Body() dto: QueryStatusCopilotDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.queryProjectStatusCopilot(dto, tenantId);
  }

  @Get('load-planning/advanced')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getAdvancedLoadPlanning(
    @Query('timeframe') timeframe: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getAdvancedLoadPlanning(timeframe, tenantId);
  }

  @Get('daily-briefing')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getDailyStandupBriefing(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getDailyStandupBriefing(tenantId);
  }

  @Get('weekly-planning')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getWeeklyTeamPlan(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getWeeklyTeamPlan(tenantId);
  }

  @Get('project/:projectId/comprehensive-health')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY', 'COMMERCIAL')
  async getComprehensiveProjectHealth(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getComprehensiveProjectHealth(projectId, tenantId);
  }

  @Get('failure-forecast')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getFailureForecastReport(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.getFailureForecastReport(tenantId);
  }

  @Post('project/:projectId/calibrate')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async calibrateHistoricalWorkload(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.calibrateHistoricalWorkload(projectId, tenantId);
  }

  @Post('vault/auto-reconcile')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async autoReconcileVaultFile(
    @Body() dto: any,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.autoReconcileVaultFile(dto, tenantId, req.user);
  }

  @Post('deliverable/check-hash-mismatch')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async detectApprovedFileHashMismatch(
    @Body() dto: any,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.copilotService.detectApprovedFileHashMismatch(dto, tenantId, req.user);
  }
}
