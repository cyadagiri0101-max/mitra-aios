import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PortfolioSnapshotService } from '../services/portfolio-snapshot.service';
import { PortfolioDemandService } from '../services/portfolio-demand.service';
import { PortfolioCapacityService } from '../services/portfolio-capacity.service';
import { PortfolioBalancingService } from '../services/portfolio-balancing.service';
import { PortfolioScenarioService } from '../services/portfolio-scenario.service';
import { EngineeringEventBus } from '../services/engineering-event-bus.service';
import {
  PortfolioSnapshotQueryDto,
  PortfolioDemandQueryDto,
  PortfolioCapacityQueryDto,
  CreateCrossProjectAllocationDto,
  UpdateAllocationStatusDto,
  SimulatePortfolioScenarioDto,
  PortfolioBalancingQueryDto,
} from '../dto/portfolio-orchestration.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/portfolio')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class PortfolioOrchestrationController {
  constructor(
    private readonly snapshotService: PortfolioSnapshotService,
    private readonly demandService: PortfolioDemandService,
    private readonly capacityService: PortfolioCapacityService,
    private readonly balancingService: PortfolioBalancingService,
    private readonly scenarioService: PortfolioScenarioService,
    private readonly eventBus: EngineeringEventBus,
  ) {}

  @Sse('events')
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  streamPortfolioEvents(@Req() req: any): Observable<MessageEvent> {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.eventBus.toObservable().pipe(
      filter((event: any) => {
        if (!event?.eventType?.startsWith('engineering.portfolio.')) return false;
        // Strict tenant isolation: client receives ZERO foreign tenant events
        return event.tenantId === tenantId;
      }),
      map((event: any) => ({
        data: {
          eventType: event.eventType,
          tenantId: event.tenantId,
          entityId: event.payload?.entityId || event.payload?.allocationId || event.payload?.snapshotId,
          projectId: event.payload?.projectId,
          timestamp: event.occurredAt ? new Date(event.occurredAt).toISOString() : new Date().toISOString(),
        },
      } as MessageEvent)),
    );
  }

  @Get('snapshot')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async getLatestSnapshot(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.snapshotService.getLatestSnapshot(tenantId);
  }

  @Post('snapshot')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async createSnapshot(
    @Body() dto: PortfolioSnapshotQueryDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const actorId = req.user?.userId || req.user?.id || 'LEAD_PLANNER';
    return this.snapshotService.createSnapshot(tenantId, {
      snapshotName: dto.snapshotName,
      projectIds: dto.projectIds,
      actorId,
    });
  }

  @Get('demand')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async getPortfolioDemand(
    @Query() query: PortfolioDemandQueryDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.demandService.calculatePortfolioDemand(tenantId, query.projectIds);
  }

  @Get('capacity')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async getPortfolioCapacity(
    @Query() query: PortfolioCapacityQueryDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.capacityService.calculatePortfolioCapacity(tenantId, query.engineerRole);
  }

  @Get('bottlenecks')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async getPortfolioBottlenecks(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const balancingResult = await this.balancingService.analyzeAndBalance(tenantId);
    return {
      tenantId,
      timestamp: balancingResult.timestamp,
      overallHealthScore: balancingResult.overallHealthScore,
      bottlenecks: balancingResult.bottlenecks,
      isAutonomousDecision: false,
    };
  }

  @Get('balancing/recommendations')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getBalancingRecommendations(
    @Query() query: PortfolioBalancingQueryDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.balancingService.analyzeAndBalance(tenantId, query.targetUtilizationCap);
  }

  @Get('allocations')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async getCrossProjectAllocations(
    @Query('projectId') projectId: string,
    @Query('engineerId') engineerId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.snapshotService.getCrossProjectAllocations(tenantId, projectId, engineerId);
  }

  @Post('allocation')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async createAllocation(
    @Body() dto: CreateCrossProjectAllocationDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const actorId = req.user?.userId || req.user?.id || 'LEAD_PROJECT_MANAGER';
    return this.snapshotService.createAllocation(tenantId, dto, actorId);
  }

  @Post('allocation/:id/status')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async updateAllocationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAllocationStatusDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const actorId = req.user?.userId || req.user?.id || 'LEAD_PROJECT_MANAGER';
    return this.snapshotService.updateAllocationStatus(tenantId, id, dto, actorId);
  }

  @Post('scenario/simulate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'EXECUTIVE')
  async simulateScenario(
    @Body() dto: SimulatePortfolioScenarioDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return this.scenarioService.simulateScenario(tenantId, dto);
  }
}
