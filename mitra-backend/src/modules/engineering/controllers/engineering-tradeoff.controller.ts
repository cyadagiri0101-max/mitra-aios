import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';
import { EngineeringTradeoffSynthesisService } from '../services/engineering-tradeoff-synthesis.service';
import {
  SynthesizeTradeoffsDto,
  RecordTradeoffDecisionDto,
  QueryTradeoffCopilotDto,
} from '../dto/engineering-tradeoff.dto';

@Controller('engineering/tradeoffs')
@UseGuards(RolesGuard)
export class EngineeringTradeoffController {
  constructor(
    private readonly tradeoffService: EngineeringTradeoffSynthesisService,
  ) {}

  @Post('synthesize')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async synthesizeTradeoffs(
    @Body() dto: SynthesizeTradeoffsDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.tradeoffService.synthesizeTradeoffs(dto, tenantId, req.user);
  }

  @Get('study/:id')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getStudyById(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.tradeoffService.getStudyById(id, tenantId);
  }

  @Get('project/:projectId')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getStudiesByProject(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.tradeoffService.getStudiesByProject(projectId, tenantId);
  }

  @Post('study/:id/decision')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async recordHumanDecision(
    @Param('id') id: string,
    @Body() dto: RecordTradeoffDecisionDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.tradeoffService.recordHumanDecision(id, dto, tenantId, req.user);
  }

  @Post('copilot-query')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async queryTradeoffCopilot(
    @Body() dto: QueryTradeoffCopilotDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.tradeoffService.queryTradeoffCopilot(dto, tenantId);
  }
}
