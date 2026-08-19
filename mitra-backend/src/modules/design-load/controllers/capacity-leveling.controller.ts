import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CapacityLevelingService } from '../services/capacity-leveling.service';
import {
  AnalyzeLevelingDto,
  ApplyLevelingActionDto,
} from '../dto/capacity-leveling.dto';

@ApiTags('planning-capacity-leveling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planning/leveling')
export class CapacityLevelingController {
  constructor(private readonly levelingService: CapacityLevelingService) {}

  @Get('analyze')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'DESIGN')
  @Permissions('capacity:leveling_analyze')
  @ApiOperation({ summary: 'Analyze multi-project capacity bottlenecks and generate leveling recommendations' })
  async analyzeLeveling(
    @Query() dto: AnalyzeLevelingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.analyzeAndRecommend(user.tenantId, dto);
  }

  @Post('apply')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING')
  @Permissions('capacity:leveling_apply')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply an approved capacity leveling action to the production schedule' })
  async applyLeveling(
    @Body() dto: ApplyLevelingActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.levelingService.applyLevelingAction(user.tenantId, dto, user.id);
  }
}
