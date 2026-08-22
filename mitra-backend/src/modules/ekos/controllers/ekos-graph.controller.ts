import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EkosGraphService } from '../services/ekos-graph.service';
import { EkosReconciliationService } from '../services/ekos-reconciliation.service';
import {
  RegisterNodeDto,
  RecordEdgeDto,
  LineageQueryDto,
  ImpactAnalysisQueryDto,
} from '../dto/ekos-graph.dto';

@ApiTags('ekos-traceability-graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/ekos/graph')
export class EkosGraphController {
  constructor(
    private readonly graphService: EkosGraphService,
    private readonly reconciliationService: EkosReconciliationService,
  ) {}

  @Post('nodes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update an entity node in the canonical EKOS graph' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async registerNode(
    @Body() dto: RegisterNodeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.graphService.registerNode(dto, user.tenantId || '', user);
  }

  @Post('edges')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record or update a semantic relationship edge in the EKOS graph' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async recordEdge(
    @Body() dto: RecordEdgeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.graphService.recordEdge(dto, user.tenantId || '', user);
  }

  @Get('lineage/:entityType/:entityId')
  @ApiOperation({ summary: 'Query upstream, downstream, or bidirectional entity lineage graph' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY', 'OPERATIONS', 'SALES')
  async getLineage(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: LineageQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.graphService.getLineage(entityType, entityId, query, user.tenantId || '');
  }

  @Get('impact/:entityType/:entityId')
  @ApiOperation({ summary: 'Evaluate blast-radius impact analysis for downstream dependencies' })
  @Roles('ADMIN', 'MANAGEMENT', 'ENGINEERING', 'PLANNING', 'QUALITY')
  async analyzeImpact(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: ImpactAnalysisQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.graphService.analyzeImpact(entityType, entityId, query, user.tenantId || '');
  }

  @Get('integrity')
  @ApiOperation({ summary: 'Run graph integrity verification and cycle detection' })
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY')
  async verifyIntegrity(@CurrentUser() user: AuthUser) {
    return this.reconciliationService.verifyGraphIntegrity(user.tenantId || '');
  }
}
