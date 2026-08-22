import { Test, TestingModule } from '@nestjs/testing';
import { CompliancePackageController } from './compliance-package.controller';
import { CompliancePackageService } from '../services/compliance-package.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

describe('CompliancePackageController', () => {
  let controller: CompliancePackageController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'auditor@mitra.ai',
    tenantId: mockTenantId,
    role: 'QUALITY',
    permissions: [],
  };

  const mockComplianceService = {
    generatePackage: jest.fn(),
    getPackageById: jest.fn(),
    exportPackage: jest.fn(),
    verifyPackageIntegrity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompliancePackageController],
      providers: [
        { provide: CompliancePackageService, useValue: mockComplianceService },
      ],
    }).compile();

    controller = module.get<CompliancePackageController>(CompliancePackageController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should generate compliance package via POST /', async () => {
    mockComplianceService.generatePackage.mockResolvedValue({ id: 'pkg-1' });

    const res = await controller.generatePackage(
      { projectId: 'proj-1' },
      mockUser,
    );

    expect(res).toEqual({ id: 'pkg-1' });
  });

  it('should verify integrity via GET /:id/integrity', async () => {
    mockComplianceService.verifyPackageIntegrity.mockResolvedValue({ isTamperFree: true });

    const res = await controller.verifyIntegrity('pkg-1', mockUser);

    expect(res.isTamperFree).toBe(true);
  });
});
