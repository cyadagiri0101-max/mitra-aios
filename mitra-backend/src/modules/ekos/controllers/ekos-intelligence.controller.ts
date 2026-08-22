import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EkosIntelligenceService } from '../services/ekos-intelligence.service';
import {
  CrossDomainQuestionDto,
  EnterpriseSearchQueryDto,
} from '../dto/ekos-intelligence.dto';

@ApiTags('ekos-intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/ekos/context')
export class EkosIntelligenceController {
  constructor(
    private readonly intelligenceService: EkosIntelligenceService,
  ) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Aggregate cross-domain unified enterprise context for a project' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async getProjectEnterpriseContext(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.intelligenceService.getProjectEnterpriseContext(
      projectId,
      user.tenantId || '',
    );
  }

  @Post('question')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask cross-domain evidence-grounded intelligence questions' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async queryCrossDomainQuestion(
    @Body() dto: CrossDomainQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.intelligenceService.queryCrossDomainQuestion(
      dto,
      user.tenantId || '',
    );
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Governed enterprise search across all canonical graph entities' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async enterpriseSearch(
    @Body() dto: EnterpriseSearchQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.intelligenceService.enterpriseSearch(
      dto,
      user.tenantId || '',
    );
  }
}
