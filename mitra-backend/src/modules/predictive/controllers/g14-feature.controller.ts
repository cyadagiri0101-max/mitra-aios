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
import { G14FeatureEngineeringService } from '../services/g14-feature-engineering.service';
import {
  ExtractFeaturesDto,
  QueryFeatureSnapshotsDto,
} from '../dto/g14-feature.dto';

@ApiTags('predictive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/predictive/features')
export class G14FeatureController {
  constructor(
    private readonly featureEngineeringService: G14FeatureEngineeringService,
  ) {}

  @Post('extract')
  @ApiOperation({ summary: 'Extract and engineer G14 features for a project' })
  async extractFeatures(
    @Body() dto: ExtractFeaturesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.featureEngineeringService.extractProjectFeatures(dto, user.tenantId || '');
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Query historical G14 feature snapshots' })
  async querySnapshots(
    @Query() query: QueryFeatureSnapshotsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.featureEngineeringService.queryFeatureSnapshots(query, user.tenantId || '');
  }
}
