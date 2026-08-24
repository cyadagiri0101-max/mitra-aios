import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ToolProvingService } from '../services/tool-proving.service';
import {
  CreateToolProvingCycleDto,
  LogToolModificationDto,
} from '../dto/design-lifecycle-capacity.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/tool-proving')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class ToolProvingController {
  constructor(private readonly provingService: ToolProvingService) {}

  @Post('cycle')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'MANUFACTURING', 'QUALITY')
  async createCycle(@Body() dto: CreateToolProvingCycleDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.provingService.createProvingCycle(dto, tenantId);
  }

  @Post('modification')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async logModification(@Body() dto: LogToolModificationDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.provingService.logModification(dto, tenantId, req.user);
  }

  @Get('cycle/:id/planned-vs-actual')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getPlannedVsActualLoad(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.provingService.getPlannedVsActualLoad(id, tenantId);
  }

  @Post('cycle/:id/re-trial')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'MANUFACTURING')
  async advanceToReTrial(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.provingService.advanceToReTrial(id, tenantId);
  }
}
