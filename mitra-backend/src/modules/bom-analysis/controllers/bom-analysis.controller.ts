import {
  Controller, Post, Get, Body, Param, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { BomAnalysisService } from '../services/bom-analysis.service';
import { AnalyzeBomDto, BomAnalysisResponseDto } from '../dto/bom-analysis.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('BOM Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bom-analysis')
export class BomAnalysisController {
  constructor(private readonly bomAnalysisService: BomAnalysisService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Permissions('bom:analyze')
  @ApiOperation({ summary: 'Analyze a BOM for a project' })
  @ApiResponse({ status: 200, type: BomAnalysisResponseDto })
  async analyze(
    @Body() dto: AnalyzeBomDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BomAnalysisResponseDto> {
    return this.bomAnalysisService.analyzeBOM(dto.projectId, dto.bomData, user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Permissions('bom:analyze')
  @ApiOperation({ summary: 'Get a specific BOM analysis by ID' })
  @ApiResponse({ status: 200, type: BomAnalysisResponseDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BomAnalysisResponseDto> {
    return this.bomAnalysisService.getAnalysis(id, user.tenantId);
  }

  @Get('project/:projectId')
  @UseGuards(RolesGuard)
  @Permissions('bom:analyze')
  @ApiOperation({ summary: 'Get all BOM analyses for a project' })
  @ApiResponse({ status: 200, type: [BomAnalysisResponseDto] })
  async getByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BomAnalysisResponseDto[]> {
    return this.bomAnalysisService.getProjectAnalyses(projectId, user.tenantId);
  }
}
