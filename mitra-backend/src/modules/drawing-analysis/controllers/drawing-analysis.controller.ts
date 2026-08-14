import {
  Controller, Post, Get, Body, Param, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { DrawingAnalysisService } from '../services/drawing-analysis.service';
import { UploadDrawingDto, DrawingAnalysisResponseDto } from '../dto/drawing-analysis.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('Drawing Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drawing-analysis')
export class DrawingAnalysisController {
  constructor(private readonly drawingAnalysisService: DrawingAnalysisService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Permissions('drawing:analyze')
  @ApiOperation({ summary: 'Upload and analyze a drawing file (STEP, IGES, PDF, DWG)' })
  @ApiResponse({ status: 200, type: DrawingAnalysisResponseDto })
  async upload(
    @Body() dto: UploadDrawingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DrawingAnalysisResponseDto> {
    return this.drawingAnalysisService.uploadAndAnalyze(dto, user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Permissions('drawing:analyze')
  @ApiOperation({ summary: 'Get a specific drawing analysis by ID' })
  @ApiResponse({ status: 200, type: DrawingAnalysisResponseDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DrawingAnalysisResponseDto> {
    return this.drawingAnalysisService.getAnalysis(id, user.tenantId);
  }

  @Get('project/:projectId')
  @UseGuards(RolesGuard)
  @Permissions('drawing:analyze')
  @ApiOperation({ summary: 'Get all drawing analyses for a project' })
  @ApiResponse({ status: 200, type: [DrawingAnalysisResponseDto] })
  async getByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DrawingAnalysisResponseDto[]> {
    return this.drawingAnalysisService.getProjectAnalyses(projectId, user.tenantId);
  }
}
