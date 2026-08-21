import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { G14CapacityFeatureService } from './g14-capacity-feature.service';
import { MachineMaster, MachineStatus } from '../../machine/entities/machinemaster.entity';
import { MachineBooking, BookingStatus } from '../../machine/entities/machinebooking.entity';
import { WorkOrder, WorkOrderStatus } from '../../manufacturing/entities/workorder.entity';
import { G14CapacitySnapshot } from '../entities/g14-capacity-snapshot.entity';
import { AuditService } from '../../audit/services/audit.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('G14CapacityFeatureService', () => {
  let service: G14CapacityFeatureService;
  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockMachineId = '22222222-2222-2222-2222-222222222222';

  const mockMachineRepository = {
    findOne: jest.fn(),
  };
  const mockBookingRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const mockWorkOrderRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const mockSnapshotRepository = {
    save: jest.fn(),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        G14CapacityFeatureService,
        { provide: getRepositoryToken(MachineMaster), useValue: mockMachineRepository },
        { provide: getRepositoryToken(MachineBooking), useValue: mockBookingRepository },
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepository },
        { provide: getRepositoryToken(G14CapacitySnapshot), useValue: mockSnapshotRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<G14CapacityFeatureService>(G14CapacityFeatureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ForbiddenException if tenantId is missing', async () => {
    await expect(
      service.extractMachineCapacityFeatures({ machineId: mockMachineId }, ''),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if featureVersion is unsupported', async () => {
    await expect(
      service.extractMachineCapacityFeatures(
        { machineId: mockMachineId, featureVersion: 'UNSUPPORTED' },
        mockTenantId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if machine does not exist', async () => {
    mockMachineRepository.findOne.mockResolvedValue(null);

    await expect(
      service.extractMachineCapacityFeatures({ machineId: mockMachineId }, mockTenantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should extract machine capacity features and enforce temporal cutoff', async () => {
    const mockMachine = {
      id: mockMachineId,
      machineNumber: 'CNC-01',
      machineName: '5-Axis CNC Mill',
      status: MachineStatus.ACTIVE,
      costPerHour: 75.0,
      lastMaintenanceDate: new Date('2026-01-01'),
      tenantId: mockTenantId,
    };

    mockMachineRepository.findOne.mockResolvedValue(mockMachine);
    mockBookingRepository.find.mockResolvedValue([
      {
        id: 'book-1',
        status: BookingStatus.CONFIRMED,
        bookedHours: 40.0,
        projectId: 'proj-1',
      },
    ]);
    mockBookingRepository.count.mockResolvedValue(2); // 2 future excluded
    mockWorkOrderRepository.find.mockResolvedValue([
      {
        id: 'wo-1',
        status: WorkOrderStatus.IN_PROGRESS,
        plannedQty: 20,
        plannedEndDate: new Date('2026-08-25'),
        projectId: 'proj-1',
      },
    ]);
    mockWorkOrderRepository.count.mockResolvedValue(1); // 1 future excluded

    const result = await service.extractMachineCapacityFeatures(
      {
        machineId: mockMachineId,
        predictionCutoff: '2026-08-21T00:00:00.000Z',
        forecastHorizonDays: 30,
        computeGroundTruthTarget: true,
      },
      mockTenantId,
    );

    expect(result).toBeDefined();
    expect(result.featureVector).toBeDefined();
    expect(result.featureVector.denseVector.length).toBe(15);
    expect(result.featureVector.machine.availableMachineHours).toBe(240); // 30 * 8
    expect(result.featureVector.machine.totalDemandHours).toBeGreaterThan(0);
    expect(result.groundTruthTarget).toBeDefined();
    expect(result.sourceRecordsHash).toBeDefined();
    expect(result.featureMetadata.sourceCounts.futureExcludedBookings).toBe(2);
  });
});
