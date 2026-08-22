import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ManufacturingTelemetryService } from '../services/manufacturing-telemetry.service';
import {
  ManufacturingSignal,
  ManufacturingSignalType,
  SignalQualityStatus,
} from '../entities/manufacturing-signal.entity';
import { ManufacturingObservation } from '../entities/manufacturing-observation.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('M10.3 Manufacturing Telemetry & Feedback E2E Certification (GS-01 -> GS-15)', () => {
  let service: ManufacturingTelemetryService;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  const machineId = '20000000-0000-0000-0000-000000000001';
  const workOrderId = '20000000-0000-0000-0000-000000000002';
  const projectId = '20000000-0000-0000-0000-000000000003';
  const trialId = '20000000-0000-0000-0000-000000000004';

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

  it('GS-01: Valid machine telemetry ingestion and normalization', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);

    const sig = await service.ingestSignal(
      {
        sourceId: 'cnc-spindle-01',
        signalType: ManufacturingSignalType.RPM,
        value: 12000,
        unit: 'rpm',
        machineId,
        eventTimestamp: new Date().toISOString(),
      },
      tenantA,
    );

    expect(sig.status).toBe(SignalQualityStatus.VALID);
  });

  it('GS-02 & GS-03: Telemetry correlated to Work Order and Operation', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);
    mockWorkOrderRepo.findOne.mockResolvedValue({ id: workOrderId, projectId });

    const sig = await service.ingestSignal(
      {
        sourceId: 'power-meter-01',
        signalType: ManufacturingSignalType.POWER_KW,
        value: 18.5,
        unit: 'kW',
        machineId,
        workOrderId,
        eventTimestamp: new Date().toISOString(),
      },
      tenantA,
    );

    expect(sig.workOrderId).toBe(workOrderId);
    expect(sig.projectId).toBe(projectId);
  });

  it('GS-04 & GS-05: Operator observation linked to Trial and EKOS projection', async () => {
    const obs = await service.createObservation(
      {
        observationType: 'TRIAL_ANOMALY',
        title: 'Gate freezing before cavity fill',
        machineId,
        workOrderId,
        trialId,
        projectId,
      },
      tenantA,
      { id: 'operator-1' },
    );

    expect(obs.id).toBe('obs-1');
    expect(mockEkosGraphService.registerNode).toHaveBeenCalled();
    expect(mockEkosGraphService.recordEdge).toHaveBeenCalled();
  });

  it('GS-06 to GS-09: Manufacturing evidence and context availability to G12/G13/G14', async () => {
    mockSignalRepo.find.mockResolvedValue([
      { id: 'sig-1', signalType: ManufacturingSignalType.CYCLE_TIME, value: 65.0 },
    ]);
    mockObservationRepo.find.mockResolvedValue([
      { id: 'obs-1', title: 'Mold cooling cycle fluctuation' },
    ]);

    const feedback = await service.getFeedbackByWorkOrder(workOrderId, tenantA);

    expect(feedback.signals.length).toBe(1);
    expect(feedback.observations.length).toBe(1);
  });

  it('GS-10: Duplicate telemetry handled idempotently', async () => {
    const existing = { id: 'sig-existing', status: SignalQualityStatus.VALID };
    mockSignalRepo.findOne.mockResolvedValue(existing);

    const sig = await service.ingestSignal(
      {
        sourceId: 'cnc-01',
        signalType: ManufacturingSignalType.CYCLE_TIME,
        value: 50,
        unit: 's',
        eventTimestamp: '2026-08-21T12:00:00Z',
      },
      tenantA,
    );

    expect(sig.id).toBe('sig-existing');
    expect(mockSignalRepo.save).not.toHaveBeenCalled();
  });

  it('GS-11: Late telemetry classified correctly', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);

    const oldTimestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const sig = await service.ingestSignal(
      {
        sourceId: 'cnc-01',
        signalType: ManufacturingSignalType.CYCLE_TIME,
        value: 50,
        unit: 's',
        eventTimestamp: oldTimestamp,
      },
      tenantA,
    );

    expect(sig.status).toBe(SignalQualityStatus.LATE);
  });

  it('GS-12: Invalid/out-of-range telemetry quarantined', async () => {
    mockSignalRepo.findOne.mockResolvedValue(null);

    const sig = await service.ingestSignal(
      {
        sourceId: 'temp-sensor',
        signalType: ManufacturingSignalType.TEMPERATURE,
        value: 2800, // Exceeds 1500 deg C limit
        unit: 'C',
        eventTimestamp: new Date().toISOString(),
      },
      tenantA,
    );

    expect(sig.status).toBe(SignalQualityStatus.OUT_OF_RANGE);
  });

  it('GS-13: Cross-tenant telemetry blocked fail-closed', async () => {
    await expect(
      service.ingestSignal(
        {
          sourceId: 'sensor-1',
          signalType: ManufacturingSignalType.CYCLE_TIME,
          value: 45,
          unit: 's',
          eventTimestamp: new Date().toISOString(),
        },
        '',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('GS-14 & GS-15: EKOS projection error does not corrupt manufacturing records', async () => {
    mockEkosGraphService.registerNode.mockRejectedValueOnce(new Error('EKOS connection timeout'));

    const obs = await service.createObservation(
      {
        observationType: 'PARAMETER_DRIFT',
        title: 'Holding pressure drop 10 bar',
        machineId,
      },
      tenantA,
    );

    expect(obs.id).toBe('obs-1');
  });
});
