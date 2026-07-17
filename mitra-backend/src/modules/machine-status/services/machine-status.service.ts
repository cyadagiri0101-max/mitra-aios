import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { MachineTelemetry, MachineStatusEnum } from '../entities/machine-telemetry.entity';
import { MachineStatus } from '../entities/machine-status.entity';
import { TelemetryDto, MachineStatusResponseDto, MachineStatusSummaryDto } from '../dto/machine-status.dto';

@Injectable()
export class MachineStatusService {
  private readonly logger = new Logger(MachineStatusService.name);

  constructor(
    @InjectRepository(MachineTelemetry)
    private readonly telemetryRepo: Repository<MachineTelemetry>,
    @InjectRepository(MachineStatus)
    private readonly statusRepo: Repository<MachineStatus>,
  ) {}

  async ingestTelemetry(dto: TelemetryDto): Promise<MachineStatusResponseDto> {
    const telemetry = this.telemetryRepo.create({
      machineId: dto.machineId,
      machineName: dto.machineName,
      status: dto.status,
      spindleLoad: dto.spindleLoad ?? null,
      feedRate: dto.feedRate ?? null,
      coolantTemp: dto.coolantTemp ?? null,
      alarmCode: dto.alarmCode ?? null,
      cycleCount: dto.cycleCount ?? null,
      recordedAt: dto.recordedAt,
      utilizationPercent: dto.utilizationPercent ?? null,
    });

    await this.telemetryRepo.save(telemetry);

    // Update or create MachineStatus aggregate
    let status = await this.statusRepo.findOne({
      where: { machineId: dto.machineId },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate today's runtime
    const todayTelemetry = await this.telemetryRepo.find({
      where: {
        machineId: dto.machineId,
        recordedAt: MoreThanOrEqual(todayStart),
      },
      order: { recordedAt: 'ASC' },
    });

    const totalRuntimeMinutes = this.calculateRuntimeMinutes(todayTelemetry);
    const utilizationPercent = this.calculateUtilization(totalRuntimeMinutes);

    if (!status) {
      status = this.statusRepo.create({
        machineId: dto.machineId,
        currentStatus: dto.status,
        lastTelemetryAt: dto.recordedAt,
        totalRuntimeToday: totalRuntimeMinutes,
        utilizationPercent,
        updatedAt: now,
      });
    } else {
      status.currentStatus = dto.status;
      status.lastTelemetryAt = dto.recordedAt;
      status.totalRuntimeToday = totalRuntimeMinutes;
      status.utilizationPercent = utilizationPercent;
      status.updatedAt = now;
    }

    const saved = await this.statusRepo.save(status);
    this.logger.log(`Telemetry ingested for machine ${dto.machineId} — status: ${dto.status}`);

    return this.mapStatusToResponse(saved);
  }

  async getAllMachineStatus(): Promise<MachineStatusResponseDto[]> {
    const statuses = await this.statusRepo.find({ order: { updatedAt: 'DESC' } });
    return statuses.map((s) => this.mapStatusToResponse(s));
  }

  async getMachineStatus(machineId: string): Promise<MachineStatusResponseDto> {
    const status = await this.statusRepo.findOne({ where: { machineId } });
    if (!status) {
      // Return a default status if none exists yet
      return {
        id: 'pending',
        machineId,
        currentStatus: MachineStatusEnum.OFFLINE,
        updatedAt: new Date(),
      };
    }
    return this.mapStatusToResponse(status);
  }

  async getDashboardSummary(): Promise<MachineStatusSummaryDto> {
    const statuses = await this.statusRepo.find();
    const counts = {
      totalMachines: statuses.length,
      running: 0,
      idle: 0,
      alarm: 0,
      setup: 0,
      offline: 0,
      totalUtilization: 0,
    };

    for (const s of statuses) {
      switch (s.currentStatus) {
        case MachineStatusEnum.RUNNING: counts.running++; break;
        case MachineStatusEnum.IDLE: counts.idle++; break;
        case MachineStatusEnum.ALARM: counts.alarm++; break;
        case MachineStatusEnum.SETUP: counts.setup++; break;
        case MachineStatusEnum.OFFLINE: counts.offline++; break;
      }
      counts.totalUtilization += s.utilizationPercent ?? 0;
    }

    const averageUtilization = counts.totalMachines > 0
      ? Math.round((counts.totalUtilization / counts.totalMachines) * 100) / 100
      : 0;

    return {
      totalMachines: counts.totalMachines,
      running: counts.running,
      idle: counts.idle,
      alarm: counts.alarm,
      setup: counts.setup,
      offline: counts.offline,
      averageUtilization,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private calculateRuntimeMinutes(telemetry: MachineTelemetry[]): number {
    if (telemetry.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < telemetry.length; i++) {
      const prev = telemetry[i - 1];
      const curr = telemetry[i];
      if (prev.status === MachineStatusEnum.RUNNING) {
        const diff = (curr.recordedAt.getTime() - prev.recordedAt.getTime()) / 1000 / 60;
        total += Math.max(0, diff);
      }
    }
    return Math.round(total * 100) / 100;
  }

  private calculateUtilization(runtimeMinutes: number): number {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0); // 8 AM shift start
    const shiftMinutes = Math.max(1, (now.getTime() - dayStart.getTime()) / 1000 / 60);
    return Math.round((runtimeMinutes / shiftMinutes) * 100 * 100) / 100;
  }

  private mapStatusToResponse(status: MachineStatus): MachineStatusResponseDto {
    return {
      id: status.id,
      machineId: status.machineId,
      currentStatus: status.currentStatus,
      lastTelemetryAt: status.lastTelemetryAt ?? undefined,
      totalRuntimeToday: status.totalRuntimeToday ?? undefined,
      utilizationPercent: status.utilizationPercent ?? undefined,
      updatedAt: status.updatedAt,
    };
  }
}
