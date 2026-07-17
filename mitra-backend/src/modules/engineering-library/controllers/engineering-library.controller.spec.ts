import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringLibraryController } from './engineering-library.controller';
import { EngineeringLibraryService } from '../services/engineering-library.service';

const makeService = () => ({
  search: jest.fn().mockResolvedValue({ results: [] }),
  listProjects: jest.fn().mockResolvedValue([]),
  getProject: jest.fn().mockResolvedValue({ id: 'p1' }),
  listDocuments: jest.fn().mockResolvedValue([]),
  getDocument: jest.fn().mockResolvedValue({ id: 'd1' }),
  getDashboardWidgets: jest.fn().mockResolvedValue({ totalProjects: 0, totalDocuments: 0, status: 'ok' }),
  synchronize: jest.fn().mockResolvedValue({ syncedAt: '2026-01-01T00:00:00.000Z', projectCount: 0, documentCount: 0, status: 'synchronized' }),
  getSyncStatus: jest.fn().mockReturnValue({ syncedAt: null, projectCount: 0, documentCount: 0, status: 'never_synced' }),
});

describe('EngineeringLibraryController', () => {
  let controller: EngineeringLibraryController;
  let service: ReturnType<typeof makeService>;

  beforeEach(async () => {
    service = makeService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngineeringLibraryController],
      providers: [{ provide: EngineeringLibraryService, useValue: service }],
    }).compile();

    controller = module.get<EngineeringLibraryController>(EngineeringLibraryController);
  });

  it('should call search on service', async () => {
    const result = await controller.search('test');
    expect(service.search).toHaveBeenCalledWith('test');
    expect(result).toEqual({ results: [] });
  });

  it('should list EKL projects', async () => {
    await controller.listProjects();
    expect(service.listProjects).toHaveBeenCalled();
  });

  it('should get EKL project by id', async () => {
    const result = await controller.getProject('p1');
    expect(service.getProject).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ id: 'p1' });
  });

  it('should list EKL documents', async () => {
    await controller.listDocuments();
    expect(service.listDocuments).toHaveBeenCalled();
  });

  it('should get EKL document by id', async () => {
    const result = await controller.getDocument('d1');
    expect(service.getDocument).toHaveBeenCalledWith('d1');
    expect(result).toEqual({ id: 'd1' });
  });

  it('should return dashboard widgets', async () => {
    const result = await controller.getDashboardWidgets();
    expect(service.getDashboardWidgets).toHaveBeenCalled();
    expect(result).toEqual({ totalProjects: 0, totalDocuments: 0, status: 'ok' });
  });

  it('should invoke synchronization', async () => {
    const result = await controller.synchronize();
    expect(service.synchronize).toHaveBeenCalled();
    expect(result.status).toBe('synchronized');
  });

  it('should return sync status', async () => {
    const result = await controller.syncStatus();
    expect(service.getSyncStatus).toHaveBeenCalled();
    expect(result.status).toBe('never_synced');
  });
});
