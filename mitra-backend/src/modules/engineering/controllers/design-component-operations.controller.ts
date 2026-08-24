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
import { DesignComponentOperationsService } from '../services/design-component-operations.service';
import {
  CreateDesignComponentDto,
  CreateComponentRevisionDto,
  UpdateComponentDeliverableStatusDto,
} from '../dto/design-component-operations.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/design-component-operations')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class DesignComponentOperationsController {
  constructor(
    private readonly componentService: DesignComponentOperationsService,
  ) {}

  @Post('component')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async createComponent(
    @Body() dto: CreateDesignComponentDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.createComponent(dto, tenantId);
  }

  @Post('component/:id/revision')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async addRevision(
    @Param('id') componentId: string,
    @Body() dto: CreateComponentRevisionDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.addComponentRevision(componentId, dto, tenantId, req.user);
  }

  @Post('deliverable/:id/status')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async updateDeliverableStatus(
    @Param('id') deliverableId: string,
    @Body() dto: UpdateComponentDeliverableStatusDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.updateDeliverableStatus(deliverableId, dto, tenantId);
  }

  @Post('deliverable/bulk-assign')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async bulkAssignDeliverables(
    @Body() dto: any,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.bulkAssignDeliverables(dto, tenantId, req.user);
  }

  @Post('deliverable/:id/seed-checklist')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'QUALITY')
  async seedDeliverableChecklist(
    @Param('id') deliverableId: string,
    @Body('deliverableType') deliverableType: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.seedDeliverableChecklist(deliverableId, deliverableType || '3D_DEVELOPMENT', tenantId, req.user);
  }

  @Get('project/:projectId/components')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getProjectComponents(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.componentService.getProjectComponents(projectId, tenantId);
  }
}
