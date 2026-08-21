import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { G14ModelTrainingService } from '../services/g14-model-training.service';
import { G14DelayInferenceService } from '../services/g14-delay-inference.service';
import {
  TrainModelDto,
  PredictDelayDto,
} from '../dto/g14-prediction.dto';

@ApiTags('predictive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/predictive')
export class G14PredictionController {
  constructor(
    private readonly modelTrainingService: G14ModelTrainingService,
    private readonly delayInferenceService: G14DelayInferenceService,
  ) {}

  @Post('models/train')
  @ApiOperation({ summary: 'Train a new G14 predictive project delay model' })
  async trainModel(
    @Body() dto: TrainModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.modelTrainingService.trainProjectDelayModel(
      dto,
      user.tenantId || '',
    );
  }

  @Get('models/active')
  @ApiOperation({ summary: 'Retrieve active trained G14 model for tenant' })
  async getActiveModel(@CurrentUser() user: AuthUser) {
    return this.modelTrainingService.getActiveModel(user.tenantId || '');
  }

  @Post('delay/predict')
  @ApiOperation({ summary: 'Generate project delay forecast and uncertainty intervals' })
  async predictDelay(
    @Body() dto: PredictDelayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.delayInferenceService.predictProjectDelay(
      dto,
      user.tenantId || '',
    );
  }
}
