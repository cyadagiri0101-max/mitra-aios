import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { G14CapacityTrainingService } from '../services/g14-capacity-training.service';
import { G14CapacityForecastService } from '../services/g14-capacity-forecast.service';
import {
  TrainCapacityModelDto,
  PredictCapacityDto,
  QueryBottlenecksDto,
} from '../dto/g14-capacity.dto';

@ApiTags('predictive-capacity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/predictive/capacity')
export class G14CapacityController {
  constructor(
    private readonly capacityTrainingService: G14CapacityTrainingService,
    private readonly capacityForecastService: G14CapacityForecastService,
  ) {}

  @Post('models/train')
  @ApiOperation({ summary: 'Train a new G14 predictive machine capacity model' })
  async trainModel(
    @Body() dto: TrainCapacityModelDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.capacityTrainingService.trainCapacityModel(
      dto,
      user.tenantId || '',
    );
  }

  @Get('models/active')
  @ApiOperation({ summary: 'Retrieve active trained G14 capacity model' })
  async getActiveModel(@CurrentUser() user: AuthUser) {
    return this.capacityTrainingService.getActiveModel(user.tenantId || '');
  }

  @Post('predict')
  @ApiOperation({ summary: 'Generate machine capacity deficit forecast and overload risk' })
  async predictCapacity(
    @Body() dto: PredictCapacityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.capacityForecastService.predictCapacity(
      dto,
      user.tenantId || '',
    );
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Scan all machines and rank potential bottleneck work-centers' })
  async getBottlenecks(
    @Query() dto: QueryBottlenecksDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.capacityForecastService.getBottlenecks(
      dto,
      user.tenantId || '',
    );
  }
}
