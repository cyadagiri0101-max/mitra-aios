import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WarrantyService, WarrantyClaimService } from './warranty.service';
import { ServiceWarranty, ServiceWarrantyStatus } from '../entities/servicewarranty.entity';
import { ServiceWarrantyClaim, ServiceWarrantyClaimStatus } from '../entities/servicewarrantyclaim.entity';
import { ServiceRequest, ServiceRequestStatus } from '../entities/servicerequest.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';

const makeRepo = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn((d: any) => ({ ...d })),
  save: jest.fn((e: any) => Promise.resolve({ id: e.id ?? 'ent-1', ...e })),
});

const makeWarranty = (overrides: Partial<ServiceWarranty> = {}) => {
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 11);
  return {
    id: 'warranty-1',
    warrantyNumber: 'WAR-1',
    projectId: 'proj-1',
    status: ServiceWarrantyStatus.ACTIVE,
    warrantyStartDate: start,
    warrantyEndDate: end,
    coverageMonths: 12,
    maxCycles: 500000,
    currentCycles: 10000,
    tenantId: 'tenant-1',
    ...overrides,
  };
};

const makeClaim = (overrides: Partial<ServiceWarrantyClaim> = {}) => ({
  id: 'claim-1',
  claimNumber: 'CLM-1',
  warrantyId: 'warranty-1',
  serviceRequestId: 'sr-1',
  projectId: 'proj-1',
  claimDate: new Date(),
  issueSummary: 'Bushing failure',
  claimAmount: 125000,
  status: ServiceWarrantyClaimStatus.SUBMITTED,
  tenantId: 'tenant-1',
  ...overrides,
});

const makeRequest = (overrides: Partial<ServiceRequest> = {}) => ({
  id: 'sr-1',
  srNumber: 'SR-1',
  projectId: 'proj-1',
  status: ServiceRequestStatus.OPEN,
  tenantId: 'tenant-1',
  ...overrides,
});

describe('WarrantyService — W3 warranty coverage governance', () => {
  let service: WarrantyService;
  let warrantyRepo: ReturnType<typeof makeRepo>;
  let outbox: { append: jest.Mock };

  beforeEach(async () => {
    warrantyRepo = makeRepo();
    outbox = { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        { provide: getRepositoryToken(ServiceWarranty), useValue: warrantyRepo },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();
    service = module.get<WarrantyService>(WarrantyService);
    jest.clearAllMocks();
  });

  it('creates a warranty with 12-month default coverage and 500,000-cycle limit', async () => {
    warrantyRepo.save.mockImplementation((w: any) => Promise.resolve({ id: 'warranty-new', ...w }));
    const result = await service.create({ projectId: 'proj-1' }, 'user-1', 'tenant-1');
    expect(result.coverageMonths).toBe(12);
    expect(result.maxCycles).toBe(500000);
    expect(result.currentCycles).toBe(0);
    expect(result.status).toBe(ServiceWarrantyStatus.ACTIVE);
    expect(result.warrantyEndDate! > result.warrantyStartDate!).toBe(true);
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED,
      'service_warranty',
      'warranty-new',
      expect.objectContaining({ projectId: 'proj-1' }),
      expect.anything(),
    );
  });

  it('rejects an invalid date range (end before start)', async () => {
    await expect(
      service.create(
        {
          projectId: 'proj-1',
          warrantyStartDate: '2026-06-01',
          warrantyEndDate: '2026-01-01',
        },
        'user-1',
        'tenant-1',
      ),
    ).rejects.toThrow(/after start date/);
  });

  it('checkCoverage rejects an incident before warranty start', async () => {
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    const result = await service.checkCoverage('warranty-1', '2020-01-01', 'tenant-1');
    expect(result.isCovered).toBe(false);
  });

  it('checkCoverage rejects an incident after warranty end', async () => {
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    const result = await service.checkCoverage('warranty-1', '2030-01-01', 'tenant-1');
    expect(result.isCovered).toBe(false);
  });

  it('checkCoverage rejects when cycle limit is exhausted', async () => {
    warrantyRepo.findOne.mockResolvedValue(
      makeWarranty({ maxCycles: 500000, currentCycles: 600000 }),
    );
    const result = await service.checkCoverage('warranty-1', undefined, 'tenant-1');
    expect(result.isCovered).toBe(false);
    expect(result.reason).toMatch(/cycle/);
  });

  it('checkCoverage confirms active coverage inside date and cycle bounds', async () => {
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    const result = await service.checkCoverage('warranty-1', undefined, 'tenant-1');
    expect(result.isCovered).toBe(true);
  });

  it('checkCoverage rejects a non-ACTIVE warranty', async () => {
    warrantyRepo.findOne.mockResolvedValue(makeWarranty({ status: ServiceWarrantyStatus.EXPIRED }));
    const result = await service.checkCoverage('warranty-1', undefined, 'tenant-1');
    expect(result.isCovered).toBe(false);
  });
});

describe('WarrantyClaimService — W5 claim adjudication', () => {
  let service: WarrantyClaimService;
  let claimRepo: ReturnType<typeof makeRepo>;
  let warrantyRepo: ReturnType<typeof makeRepo>;
  let requestRepo: ReturnType<typeof makeRepo>;
  let em: { getRepository: jest.Mock };
  let outbox: { append: jest.Mock };
  const user = { id: 'user-1', tenantId: 'tenant-1', email: 'qm@mitra.local' };

  beforeEach(async () => {
    claimRepo = makeRepo();
    warrantyRepo = makeRepo();
    requestRepo = makeRepo();
    outbox = { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) };
    em = {
      getRepository: jest.fn((entity: any) => {
        if (entity === ServiceWarrantyClaim) return claimRepo;
        if (entity === ServiceWarranty) return warrantyRepo;
        if (entity === ServiceRequest) return requestRepo;
        throw new Error('Unexpected entity in transaction');
      }),
    };
    const dataSource = { transaction: jest.fn(async (cb: (em: any) => unknown) => cb(em)) } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyClaimService,
        { provide: getRepositoryToken(ServiceWarrantyClaim), useValue: claimRepo },
        { provide: getRepositoryToken(ServiceWarranty), useValue: warrantyRepo },
        { provide: getRepositoryToken(ServiceRequest), useValue: requestRepo },
        { provide: OutboxService, useValue: outbox },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get<WarrantyClaimService>(WarrantyClaimService);
    jest.clearAllMocks();
  });

  it('rejects adjudication of a missing or cross-tenant claim (404)', async () => {
    claimRepo.findOne.mockResolvedValue(null);
    await expect(
      service.adjudicate('claim-other', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(NotFoundException);
    expect(claimRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'claim-other', tenantId: 'tenant-1' }) }),
    );
  });

  it('rejects re-adjudication of an already decided claim', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim({ status: ServiceWarrantyClaimStatus.APPROVED }));
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'REJECT', rejectionReason: 'late' }),
    ).rejects.toThrow(/already been adjudicated/);
  });

  it('rejects APPROVE when linked warranty is not ACTIVE', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    warrantyRepo.findOne.mockResolvedValue(makeWarranty({ status: ServiceWarrantyStatus.EXPIRED }));
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(/EXPIRED/);
  });

  it('rejects APPROVE when warranty coverage window has lapsed', async () => {
    claimRepo.findOne.mockResolvedValue(
      makeClaim({ claimDate: new Date('2030-06-01') }),
    );
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(/expiration/);
  });

  it('rejects APPROVE when warranty cycle limit is exhausted', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    warrantyRepo.findOne.mockResolvedValue(
      makeWarranty({ maxCycles: 500000, currentCycles: 600000 }),
    );
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(/cycle limit/);
  });

  it('rejects APPROVE when linked service request belongs to a different project', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    requestRepo.findOne.mockResolvedValue(makeRequest({ projectId: 'proj-other' }));
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(/different project/);
  });

  it('rejects APPROVE when the claim has no valid financial data', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim({ claimAmount: null }));
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    requestRepo.findOne.mockResolvedValue(makeRequest());
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'APPROVE' }),
    ).rejects.toThrow(/financial data/);
  });

  it('rejects REJECT without a mandatory rejection reason', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    await expect(
      service.adjudicate('claim-1', user as any, { decision: 'REJECT' }),
    ).rejects.toThrow(/rejection reason/i);
  });

  it('APPROVE records approvedAmount and synchronizes the service request to RESOLVED', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    requestRepo.findOne.mockResolvedValue(makeRequest());
    requestRepo.save.mockImplementation((r: any) => Promise.resolve({ id: 'sr-1', ...r }));
    claimRepo.save.mockImplementation((c: any) => Promise.resolve({ id: 'claim-1', ...c }));

    const result = await service.adjudicate('claim-1', user as any, {
      decision: 'APPROVE',
      approvalNotes: 'Covered under warranty',
      resolutionNotes: 'Field repair completed',
    });

    expect(result.claim.status).toBe(ServiceWarrantyClaimStatus.APPROVED);
    expect(result.claim.approvedBy).toBe('user-1');
    expect(result.claim.approvedAmount).toBe(125000);
    expect(result.request!.status).toBe(ServiceRequestStatus.RESOLVED);
    expect(result.request!.resolutionSummary).toContain('Field repair completed');
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.SERVICE_WARRANTY_CLAIM_ADJUDICATED,
      'service_warranty_claim',
      'claim-1',
      expect.objectContaining({ decision: 'APPROVE', serviceRequestId: 'sr-1' }),
      expect.objectContaining({ tenantId: 'tenant-1', actorId: 'user-1' }),
    );
  });

  it('APPROVE honors an explicit approvedAmount from the adjudicator', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    warrantyRepo.findOne.mockResolvedValue(makeWarranty());
    requestRepo.findOne.mockResolvedValue(makeRequest());
    requestRepo.save.mockImplementation((r: any) => Promise.resolve({ id: 'sr-1', ...r }));
    claimRepo.save.mockImplementation((c: any) => Promise.resolve({ id: 'claim-1', ...c }));

    const result = await service.adjudicate('claim-1', user as any, {
      decision: 'APPROVE',
      approvedAmount: 95000,
    });
    expect(result.claim.approvedAmount).toBe(95000);
  });

  it('REJECT records the mandatory reason and does not touch the service request', async () => {
    claimRepo.findOne.mockResolvedValue(makeClaim());
    claimRepo.save.mockImplementation((c: any) => Promise.resolve({ id: 'claim-1', ...c }));

    const result = await service.adjudicate('claim-1', user as any, {
      decision: 'REJECT',
      rejectionReason: 'Material test report missing',
    });

    expect(result.claim.status).toBe(ServiceWarrantyClaimStatus.REJECTED);
    expect(result.claim.eligibilityReason).toBe('Material test report missing');
    expect(result.request).toBeNull();
    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(outbox.append).toHaveBeenCalledWith(
      EngineeringDomainEventType.SERVICE_WARRANTY_CLAIM_ADJUDICATED,
      'service_warranty_claim',
      'claim-1',
      expect.objectContaining({ decision: 'REJECT', rejectionReason: 'Material test report missing' }),
      expect.anything(),
    );
  });
});