import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { G14ModelRegistryService } from '../services/g14-model-registry.service';
import { ModelCapability } from '../entities/g14-model-registry.entity';
import {
  QueryModelRegistryDto,
  EvaluateModelDto,
  ApproveModelDto,
  RejectModelDto,
  ActivateModelDto,
  RollbackModelDto,
} from '../dto/g14-registry.dto';

@ApiTags('predictive-model-registry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/predictive/models')
export class G14ModelRegistryController {
  constructor(
    private readonly registryService: G14ModelRegistryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List models in the predictive model registry' })
  async listModels(
    @Query() query: QueryModelRegistryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.listModels(query, user.tenantId || '');
  }

  @Get('active/:capability')
  @ApiOperation({ summary: 'Get current active champion model by capability' })
  async getActiveModel(
    @Param('capability') capability: ModelCapability,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.getActiveModelByCapability(
      capability,
      user.tenantId || '',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model details by ID' })
  async getModelById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.getModelById(id, user.tenantId || '');
  }

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Evaluate model against validation gates' })
  async evaluateModel(
    @Param('id') id: string,
    @Body() dto: EvaluateModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.evaluateModel(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/request-approval')
  @ApiOperation({ summary: 'Request formal approval for evaluated model' })
  async requestApproval(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.requestApproval(
      id,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve model for activation' })
  async approveModel(
    @Param('id') id: string,
    @Body() dto: ApproveModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.approveModel(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject model during approval review' })
  async rejectModel(
    @Param('id') id: string,
    @Body() dto: RejectModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.rejectModel(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Atomically activate model as champion for capability' })
  async activateModel(
    @Param('id') id: string,
    @Body() dto: ActivateModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.activateModel(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/retire')
  @ApiOperation({ summary: 'Retire an active model' })
  async retireModel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.retireModel(
      id,
      user.tenantId || '',
      user.email || user.id,
    );
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Atomically rollback from active model to previous champion' })
  async rollbackModel(
    @Param('id') id: string,
    @Body() dto: RollbackModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registryService.rollbackModel(
      id,
      dto,
      user.tenantId || '',
      user.email || user.id,
    );
  }
}
