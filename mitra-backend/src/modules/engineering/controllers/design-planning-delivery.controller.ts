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
import { DesignPlanningDeliveryService } from '../services/design-planning-delivery.service';
import {
  CalculateProjectComplexityDto,
  CreateDesignChecklistDto,
  CompleteChecklistItemDto,
  CreateDesignDependencyDto,
  CreateDesignBlockerDto,
  ProjectAcceptanceSimulationDto,
  WhatIfScenarioDto,
  RecordHistoricalWorkloadDto,
} from '../dto/design-planning-delivery.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/design-planning')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class DesignPlanningDeliveryController {
  constructor(
    private readonly planningService: DesignPlanningDeliveryService,
  ) {}

  @Post('complexity')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async calculateComplexity(
    @Body() dto: CalculateProjectComplexityDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.calculateAndSaveComplexity(dto, tenantId);
  }

  @Post('checklist')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async createChecklist(
    @Body() dto: CreateDesignChecklistDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.createChecklist(dto, tenantId);
  }

  @Post('checklist/item/:id/complete')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async completeChecklistItem(
    @Param('id') itemId: string,
    @Body() dto: CompleteChecklistItemDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.completeChecklistItem(itemId, dto, tenantId, req.user);
  }

  @Post('dependency')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async createDependency(
    @Body() dto: CreateDesignDependencyDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.createDependency(dto, tenantId);
  }

  @Post('blocker')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async createBlocker(
    @Body() dto: CreateDesignBlockerDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.createBlocker(dto, tenantId);
  }

  @Post('blocker/:id/resolve')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async resolveBlocker(
    @Param('id') blockerId: string,
    @Body() body: { resolutionNotes: string },
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.resolveBlocker(blockerId, body.resolutionNotes, tenantId);
  }

  @Get('load-board')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getTeamLoadBoard(
    @Query('timeframe') timeframe: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.getTeamLoadBoard(tenantId, timeframe);
  }

  @Get('project-control/:projectId')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getProjectLoadControl(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.getProjectLoadControl(projectId, tenantId);
  }

  @Post('project-acceptance-simulation')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'COMMERCIAL')
  async simulateProjectAcceptance(
    @Body() dto: ProjectAcceptanceSimulationDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.simulateProjectAcceptance(dto, tenantId);
  }

  @Post('what-if-simulation')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async simulateWhatIf(
    @Body() dto: WhatIfScenarioDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.simulateWhatIf(dto, tenantId);
  }

  @Post('historical-workload')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async recordHistoricalWorkload(
    @Body() dto: RecordHistoricalWorkloadDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.planningService.recordHistoricalWorkload(dto, tenantId);
  }
}
