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
import { DesignLifecycleService } from '../services/design-lifecycle.service';
import { DesignCapacityService } from '../services/design-capacity.service';
import {
  CreateDesignWorkPackageDto,
  AdvanceDesignStageDto,
  CreateWorkloadTemplateDto,
  RegisterEngineerProfileDto,
} from '../dto/design-lifecycle-capacity.dto';
import {
  ENGINEERING_WORKSPACE_THROTTLE,
  ENGINEERING_REVIEW_THROTTLE,
} from '../../../common/config/throttle.config';

@Controller('api/engineering/design-lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class DesignLifecycleController {
  constructor(
    private readonly lifecycleService: DesignLifecycleService,
    private readonly capacityService: DesignCapacityService,
  ) {}

  @Post('template')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING')
  async createTemplate(@Body() dto: CreateWorkloadTemplateDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.createWorkloadTemplate(dto, tenantId);
  }

  @Get('templates')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getTemplates(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.getTemplates(tenantId);
  }

  @Post('package')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async createPackage(@Body() dto: CreateDesignWorkPackageDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.createWorkPackage(dto, tenantId, req.user);
  }

  @Get('package/:id')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getPackageById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.getPackageById(id, tenantId);
  }

  @Post('package/:id/advance')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING')
  async advanceStage(
    @Param('id') id: string,
    @Body() dto: AdvanceDesignStageDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.advanceStage(id, dto, tenantId, req.user);
  }

  @Post('package/:id/customer-approval')
  @Throttle({ default: ENGINEERING_REVIEW_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'COMMERCIAL')
  async customerApproval(
    @Param('id') id: string,
    @Body() body: { approved: boolean; notes: string },
    @Req() req: any,
  ) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.lifecycleService.recordCustomerApproval(
      id,
      body.approved,
      body.notes,
      tenantId,
      req.user,
    );
  }

  @Post('engineer')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async registerEngineer(@Body() dto: RegisterEngineerProfileDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.capacityService.registerEngineer(dto, tenantId);
  }

  @Get('capacity/team')
  @Throttle({ default: ENGINEERING_WORKSPACE_THROTTLE })
  @Roles('ADMIN', 'ENGINEERING', 'PLANNING')
  async getTeamCapacity(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    return await this.capacityService.calculateTeamCapacity(tenantId);
  }
}
