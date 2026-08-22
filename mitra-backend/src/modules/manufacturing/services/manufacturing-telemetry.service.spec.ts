import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ManufacturingTelemetryService } from './manufacturing-telemetry.service';
import {
  ManufacturingSignal,
  ManufacturingSignalType,
  SignalQualityStatus,
} from '../entities/manufacturing-signal.entity';
import { ManufacturingObservation } from '../entities/manufacturing-observation.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('ManufacturingTelemetryService', () => {
  let service: ManufacturingTelemetryService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockMachineId = '22222222-2222-2222-2222-222222222222';
  const mockWorkOrderId = '33333333-3333-3333-3333-333333333333';

  const mockSignalRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'sig-1', ...dto })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockObservationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve({ id: 'obs-1', ...dto })),
    find: jest.fn(),
  };

  const mockWorkOrderRepo = {
    findOne: jest.fn(),
  };

  const mockEkosGraphService = {
    registerNode: jest.fn().mockResolvedValue({ id: 'node-obs-1' }),
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturingTelemetryService,
        { provide: getRepositoryToken(ManufacturingSignal), useValue: mockSignalRepo },
        { provide: getRepositoryToken(ManufacturingObservation), useValue: mockObservationRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        { provide: EkosGraphService, useValue: mockEkosGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ManufacturingTelemetryService>(ManufacturingTelemetryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenant context is missing', async () => {
    await expect(
      service.ingestSignal(
        {
          sourceId: 'sensor-1',
          signalType: ManufacturingSignalType.CYCLE_TIME,
          value: 45.2,
          unit: 's',
          eventTimestamp: new Date().toISOString(),
        },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should ingest and normalize a valid telemetry signal', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);
    mockWorkOrderRepo.findOne.mockResolvedValue({
      id: mockWorkOrderId,
      projectId: 'proj-1',
    });

    const res = await service.ingestSignal(
      {
        sourceId: 'sensor-1',
        signalType: ManufacturingSignalType.CYCLE_TIME,
        value: 52.4,
        unit: 's',
        machineId: mockMachineId,
        workOrderId: mockWorkOrderId,
        eventTimestamp: new Date().toISOString(),
      },
      mockTenantId,
    );

    expect(res.status).toBe(SignalQualityStatus.VALID);
    expect(mockSignalRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MANUFACTURING_TELEMETRY_INGESTED' }),
    );
  });

  it('should classify out-of-range RPM values', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);

    const res = await service.ingestSignal(
      {
        sourceId: 'spindle-sensor',
        signalType: ManufacturingSignalType.RPM,
        value: 95000,
        unit: 'rpm',
        eventTimestamp: new Date().toISOString(),
      },
      mockTenantId,
    );

    expect(res.status).toBe(SignalQualityStatus.OUT_OF_RANGE);
  });

  it('should handle duplicate signals idempotently without creating extra records', async () => {
    const existing = {
      id: 'sig-dup',
      tenantId: mockTenantId,
      sourceId: 'sensor-1',
      status: SignalQualityStatus.VALID,
    };
    mockSignalRepo.findOne.mockResolvedValue(existing);

    const res = await service.ingestSignal(
      {
        sourceId: 'sensor-1',
        signalType: ManufacturingSignalType.CYCLE_TIME,
        value: 50.0,
        unit: 's',
        eventTimestamp: '2026-08-21T10:00:00Z',
      },
      mockTenantId,
    );

    expect(res.id).toBe('sig-dup');
    expect(mockSignalRepo.save).not.toHaveBeenCalled();
  });

  it('should record an operator observation with EKOS lineage projection', async () => {
    const obs = await service.createObservation(
      {
        observationType: 'TOOL_WEAR',
        title: 'Insert Flank Wear 0.3mm',
        machineId: mockMachineId,
        workOrderId: mockWorkOrderId,
      },
      mockTenantId,
      { id: 'user-1' },
    );

    expect(obs.id).toBe('obs-1');
    expect(mockEkosGraphService.registerNode).toHaveBeenCalled();
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalledTimes(2);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MANUFACTURING_OBSERVATION_RECORDED' }),
    );
  });
});
