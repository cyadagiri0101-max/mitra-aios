import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BomAnalysisService } from './bom-analysis.service';
import { BomAnalysis } from '../entities/bom-analysis.entity';
import { BomItem } from '../entities/bom-item.entity';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: any) => ({ ...d, id: 'analysis-1' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-analysis-1', ...e })),
});

describe('BomAnalysisService — Tenant Isolation', () => {
  let service: BomAnalysisService;
  let analysisRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    analysisRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BomAnalysisService,
        { provide: getRepositoryToken(BomAnalysis), useValue: analysisRepo },
        { provide: getRepositoryToken(BomItem), useValue: makeRepo() },
      ],
    }).compile();

    service = module.get<BomAnalysisService>(BomAnalysisService);
  });

  it('rejects tenantless analyzeBOM, getAnalysis, getProjectAnalyses with 403', async () => {
    await expect(service.analyzeBOM('p-1', {}, '')).rejects.toThrow(ForbiddenException);
    await expect(service.getAnalysis('a-1', undefined)).rejects.toThrow(ForbiddenException);
    await expect(service.getProjectAnalyses('p-1', null)).rejects.toThrow(ForbiddenException);
  });

  it('persists tenantId on analyzeBOM', async () => {
    const res = await service.analyzeBOM('p-1', { parts: [] }, 'tenant-a');
    expect(analysisRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p-1', tenantId: 'tenant-a' }),
    );
  });

  it('scopes getAnalysis to caller tenant and throws 404 on cross-tenant read', async () => {
    analysisRepo.findOne.mockResolvedValue(null);
    await expect(service.getAnalysis('a-1', 'tenant-b')).rejects.toThrow(NotFoundException);
    expect(analysisRepo.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'a-1', tenantId: 'tenant-b' }),
      relations: ['items'],
    });
  });
});
