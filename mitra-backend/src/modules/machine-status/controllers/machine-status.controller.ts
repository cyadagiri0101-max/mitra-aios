import {
  Controller, Post, Get, Body, Param, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { MachineStatusService } from '../services/machine-status.service';
import { TelemetryDto, MachineStatusResponseDto, MachineStatusSummaryDto } from '../dto/machine-status.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('Machine Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('machine-status')
export class MachineStatusController {
  constructor(private readonly machineStatusService: MachineStatusService) {}

  @Post('telemetry')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiOperation({ summary: 'Ingest machine telemetry data' })
  @ApiResponse({ status: 200, type: MachineStatusResponseDto })
  async ingestTelemetry(
    @Body() dto: TelemetryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MachineStatusResponseDto> {
    return this.machineStatusService.ingestTelemetry(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiOperation({ summary: 'Get all machine statuses' })
  @ApiResponse({ status: 200, type: [MachineStatusResponseDto] })
  async getAll(): Promise<MachineStatusResponseDto[]> {
    return this.machineStatusService.getAllMachineStatus();
  }

  @Get('summary/dashboard')
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiOperation({ summary: 'Get dashboard summary of all machines' })
  @ApiResponse({ status: 200, type: MachineStatusSummaryDto })
  async getSummary(): Promise<MachineStatusSummaryDto> {
    return this.machineStatusService.getDashboardSummary();
  }

  @Get(':machineId')
  @UseGuards(RolesGuard)
  @Permissions('machine:read')
  @ApiOperation({ summary: 'Get status for a specific machine' })
  @ApiResponse({ status: 200, type: MachineStatusResponseDto })
  async getById(
    @Param('machineId') machineId: string,
  ): Promise<MachineStatusResponseDto> {
    return this.machineStatusService.getMachineStatus(machineId);
  }
}
