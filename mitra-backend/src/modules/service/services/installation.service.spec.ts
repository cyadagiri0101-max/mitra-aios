import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InstallationService } from './installation.service';
import { ServiceInstallation, ServiceInstallationStatus } from '../entities/serviceinstallation.entity';
import { ServiceWarranty, ServiceWarrantyStatus } from '../entities/servicewarranty.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';

const makeRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((d: any) => ({ ...d })),
  save: jest.fn((e: any) => Promise.resolve({ id: e.id ?? 'warranty-1', ...e })),
});

const makeInstallation = (overrides: Partial<ServiceInstallation> = {}) => ({
  id: 'inst-1',
  installationNumber: 'INST-TEST-1',
  projectId: 'proj-1',
  dispatchId: 'dispatch-1',
  customerId: 'cust-1',
  status: ServiceInstallationStatus.SCHEDULED,
  customerSignoff: false,
  signoffBy: null,
  completionDate: null,
  installationReport: null,
  checklist: null,
  tenantId: 'tenant-1',
  ...overrides,
});

describe('InstallationService — W2 installation completion gate & warranty activation', () => {
  let service: InstallationService;
  let instRepo: ReturnType<typeof makeRepo>;
  let warrantyRepo: ReturnType<typeof makeRepo>;
  let em: { getRepository: jest.Mock };
  let outbox: { append: jest.Mock };
  const user = { id: 'user-1', tenantId: 'tenant-1', email: 'svc@mitra.local' };

  beforeEach(async () => {
    instRepo = makeRepo();
    warrantyRepo = makeRepo();
    outbox = { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }) };
    em = {
      getRepository: jest.fn((entity: any) => {
        if (entity === ServiceInstallation) return instRepo;
        if (entity === ServiceWarranty) return warrantyRepo;
        throw new Error('Unexpected entity in transaction');
      }),
    };
    const dataSource = { transaction: jest.fn(async (cb: (em: any) => unknown) => cb(em)) } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallationService,
        { provide: getRepositoryToken(ServiceInstallation), useValue: instRepo },
        { provide: getRepositoryToken(ServiceWarranty), useValue: warrantyRepo },
        { provide: OutboxService, useValue: outbox },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get<InstallationService>(InstallationService);
    jest.clearAllMocks();
  });

  it('completion is rejected when commissioning report is missing', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    await expect(
      service.completeInstallation('inst-1', user as any, { signoffBy: 'Vikram Mehta' }),
    ).rejects.toThrow(/installation report/);
  });

  it('completion is rejected when setup/test results (checklist) are missing', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    await expect(
      service.completeInstallation('inst-1', user as any, {
        signoffBy: 'Vikram Mehta',
        installationReport: 'Commissioned OK',
      }),
    ).rejects.toThrow(/checklist/);
  });

  it('completion is rejected when customer sign-off is missing', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    await expect(
      service.completeInstallation('inst-1', user as any, {
        installationReport: 'Commissioned OK',
        checklist: [{ item: 'Dry cycle', result: 'PASS' }],
      } as any),
    ).rejects.toThrow(/sign-off/);
  });

  it('completion is rejected for an already completed installation', async () => {
    instRepo.findOne.mockResolvedValue(
      makeInstallation({
        status: ServiceInstallationStatus.COMPLETED,
        installationReport: 'OK',
        checklist: [{ item: 'A', result: 'PASS' }],
      }),
    );
    await expect(
      service.completeInstallation('inst-1', user as any, {
        signoffBy: 'Vikram Mehta',
        installationReport: 'OK',
        checklist: [{ item: 'A', result: 'PASS' }],
      }),
    ).rejects.toThrow(/already completed/);
  });

  it('returns 404 for cross-tenant or missing installation', async () => {
    instRepo.findOne.mockResolvedValue(null);
    await expect(
      service.completeInstallation('inst-other', user as any, {
        signoffBy: 'Vikram Mehta',
        installationReport: 'OK',
        checklist: [{ item: 'A', result: 'PASS' }],
      }),
    ).rejects.toThrow(NotFoundException);
    expect(instRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'inst-other', tenantId: 'tenant-1' }) }),
    );
  });

  it('completes commissioning, records sign-off and activates a 12-month warranty by default', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    warrantyRepo.findOne.mockResolvedValue(null);
    warrantyRepo.save.mockImplementation((w: any) => Promise.resolve({ id: 'warranty-1', ...w }));

    const result = await service.completeInstallation('inst-1', user as any, {
      signoffBy: 'Vikram Mehta (Chief Plant Engineer)',
      installationReport: 'Tool commissioned. First article verified in tolerance.',
      checklist: [
        { item: 'Bed alignment', result: 'PASS' },
        { item: 'Dry cycle trial', result: 'PASS' },
      ],
      coverageMonths: 12,
    });

    expect(result.installation.status).toBe(ServiceInstallationStatus.COMPLETED);
    expect(result.installation.customerSignoff).toBe(true);
    expect(result.installation.signoffBy).toContain('Vikram Mehta');
    expect(result.installation.completionDate).toBeDefined();

    expect(result.warranty).toBeDefined();
    const warranty = result.warranty!;
    expect(warranty.status).toBe(ServiceWarrantyStatus.ACTIVE);
    expect(warranty.coverageMonths).toBe(12);
    expect(warranty.maxCycles).toBe(500000);
    expect(warranty.currentCycles).toBe(0);
    expect(warranty.warrantyEndDate! > warranty.warrantyStartDate!).toBe(true);
    expect(warranty.projectId).toBe('proj-1');
    expect(warranty.dispatchId).toBe('dispatch-1');
  });

  it('emits SERVICE_INSTALLATION_COMPLETED and SERVICE_WARRANTY_ACTIVATED outbox events', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    warrantyRepo.findOne.mockResolvedValue(null);
    warrantyRepo.save.mockImplementation((w: any) => Promise.resolve({ id: 'warranty-1', ...w }));

    await service.completeInstallation('inst-1', user as any, {
      signoffBy: 'Vikram Mehta',
      installationReport: 'Commissioned',
      checklist: [{ item: 'A', result: 'PASS' }],
    });

    const eventTypes = outbox.append.mock.calls.map((c) => c[0]);
    expect(eventTypes).toContain(EngineeringDomainEventType.SERVICE_INSTALLATION_COMPLETED);
    expect(eventTypes).toContain(EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED);
  });

  it('prevents duplicate active warranty for the same project', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    const existing = {
      id: 'warranty-existing',
      projectId: 'proj-1',
      status: ServiceWarrantyStatus.ACTIVE,
      warrantyNumber: 'WAR-EXISTING',
      tenantId: 'tenant-1',
    };
    warrantyRepo.findOne.mockResolvedValue(existing);

    const result = await service.completeInstallation('inst-1', user as any, {
      signoffBy: 'Vikram Mehta',
      installationReport: 'Commissioned',
      checklist: [{ item: 'A', result: 'PASS' }],
    });

    expect(result.warranty).toBeNull();
    expect(warrantyRepo.save).not.toHaveBeenCalled();
    const eventTypes = outbox.append.mock.calls.map((c) => c[0]);
    expect(eventTypes).not.toContain(EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED);
  });

  it('does not activate warranty when autoActivateWarranty is false', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    const result = await service.completeInstallation('inst-1', user as any, {
      signoffBy: 'Vikram Mehta',
      installationReport: 'Commissioned',
      checklist: [{ item: 'A', result: 'PASS' }],
      autoActivateWarranty: false,
    });
    expect(result.warranty).toBeNull();
    expect(warrantyRepo.save).not.toHaveBeenCalled();
    expect(outbox.append.mock.calls.map((c) => c[0])).not.toContain(
      EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED,
    );
  });

  it('installation failure path (missing checklist) never activates warranty', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    await expect(
      service.completeInstallation('inst-1', user as any, {
        signoffBy: 'Vikram Mehta',
        installationReport: 'Commissioned',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(warrantyRepo.save).not.toHaveBeenCalled();
  });

  it('scopes warranty queries to the caller tenant', async () => {
    instRepo.findOne.mockResolvedValue(makeInstallation());
    warrantyRepo.findOne.mockResolvedValue(null);
    await service.completeInstallation('inst-1', user as any, {
      signoffBy: 'Vikram Mehta',
      installationReport: 'Commissioned',
      checklist: [{ item: 'A', result: 'PASS' }],
    });
    expect(warrantyRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-1', tenantId: 'tenant-1' }) }),
    );
  });
});