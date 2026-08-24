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
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';
import { DigitalThreadGeometryService } from '../services/digital-thread-geometry.service';
import {
  RegisterGeometryAssetDto,
  PerformGovernedMeasurementDto,
  Query3dCopilotDto,
} from '../dto/digital-thread-geometry.dto';

@Controller('api/engineering/digital-thread')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class DigitalThreadGeometryController {
  constructor(
    private readonly geometryService: DigitalThreadGeometryService,
  ) {}

  @Post('geometry/register')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async registerGeometryAsset(
    @Body() dto: RegisterGeometryAssetDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.geometryService.registerGeometryAsset(dto, tenantId, req.user);
  }

  @Get('project/:projectId/geometry')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY', 'COMMERCIAL')
  async getProjectGeometryAssets(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.geometryService.getProjectGeometryAssets(projectId, tenantId);
  }

  @Post('measurement')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async performGovernedMeasurement(
    @Body() dto: PerformGovernedMeasurementDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.geometryService.performGovernedMeasurement(dto, tenantId);
  }

  @Post('3d-copilot')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY', 'COMMERCIAL')
  async query3dCopilot(
    @Body() dto: Query3dCopilotDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.geometryService.query3dCopilot(dto, tenantId);
  }

  @Get('ekos-neighborhood/:nodeId')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async getEkosVisualNeighborhood(
    @Param('nodeId') nodeId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.geometryService.getEkosVisualNeighborhood(nodeId, tenantId);
  }
}
