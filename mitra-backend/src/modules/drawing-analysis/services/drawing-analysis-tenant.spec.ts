import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DrawingAnalysisService } from './drawing-analysis.service';
import { DrawingAnalysis, DrawingFileType } from '../entities/drawing-analysis.entity';
import { MinioService } from '@modules/storage/minio.service';

const makeRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: any) => ({ ...d, id: 'drawing-1' })),
  save: jest.fn((e: any) => Promise.resolve({ id: 'saved-drawing-1', ...e })),
});

describe('DrawingAnalysisService — Tenant Isolation', () => {
  let service: DrawingAnalysisService;
  let drawingRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    drawingRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingAnalysisService,
        { provide: getRepositoryToken(DrawingAnalysis), useValue: drawingRepo },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ bucket: 'b', key: 'k' }),
            generatePresignedGetUrl: jest.fn().mockResolvedValue({ url: 'http://minio/drawing.step' }),
          },
        },
      ],
    }).compile();

    service = module.get<DrawingAnalysisService>(DrawingAnalysisService);
  });

  it('rejects tenantless uploadAndAnalyze, getAnalysis, getProjectAnalyses with 403', async () => {
    const dto = { projectId: 'p-1', fileName: 'f.step', fileType: DrawingFileType.STEP, fileContentBase64: 'AAAA' };
    await expect(service.uploadAndAnalyze(dto, '')).rejects.toThrow(ForbiddenException);
    await expect(service.getAnalysis('da-1', undefined)).rejects.toThrow(ForbiddenException);
    await expect(service.getProjectAnalyses('p-1', null)).rejects.toThrow(ForbiddenException);
  });

  it('persists tenantId on uploadAndAnalyze', async () => {
    const dto = { projectId: 'p-1', fileName: 'f.step', fileType: DrawingFileType.STEP, fileContentBase64: 'AAAA' };
    await service.uploadAndAnalyze(dto, 'tenant-a');
    expect(drawingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p-1', tenantId: 'tenant-a' }),
    );
  });

  it('scopes getAnalysis to caller tenant and throws 404 on cross-tenant read', async () => {
    drawingRepo.findOne.mockResolvedValue(null);
    await expect(service.getAnalysis('da-1', 'tenant-b')).rejects.toThrow(NotFoundException);
    expect(drawingRepo.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'da-1', tenantId: 'tenant-b' }),
    });
  });
});
