import { ToolMasterService } from './tool-master.service';
import { ToolMasterMetadataService } from './tool-master-metadata.service';

describe('ToolMasterService', () => {
  let service: ToolMasterService;
  let repo: { findAndCount: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let engineeringIndexerService: { browse: jest.Mock };
  let metadataService: ToolMasterMetadataService;

  beforeEach(() => {
    repo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
    };
    engineeringIndexerService = {
      browse: jest.fn().mockResolvedValue([]),
    };
    metadataService = new ToolMasterMetadataService();

    service = new ToolMasterService(repo as any, metadataService, engineeringIndexerService as any);
  });

  it('creates a tenant-scoped tool record', async () => {
    const created = await service.create({ toolNo: 'BM450', toolType: 'BM' }, 'user-1', 'tenant-1');
    expect(created.tenantId).toBe('tenant-1');
    expect(created.createdBy).toBe('user-1');
  });

  it('returns categorized engineering context for a tool record', async () => {
    repo.findOne.mockResolvedValue({ id: 'tool-1', toolNo: 'BM450', toolType: 'BM' });
    engineeringIndexerService.browse.mockResolvedValue([
      { toolNo: 'BM450', itemType: 'file', fileName: 'Part List.xls', extension: '.xls', relativePath: 'bm450/part-list.xls', folderName: 'BM450' },
      { toolNo: 'BM450', itemType: 'file', fileName: 'Drawing.dwg', extension: '.dwg', relativePath: 'bm450/drawing.dwg', folderName: 'BM450' },
      { toolNo: 'BM450', itemType: 'folder', fileName: '', extension: null, relativePath: 'bm450', folderName: 'BM450' },
    ]);
    jest.spyOn(service as any, 'getPartListData').mockResolvedValue([{ revision: 'RevA', filePath: 'Partlist', totalCost: 1000 }]);

    const context = await service.getEngineeringContext('tool-1', 'tenant-1');

    expect(engineeringIndexerService.browse).toHaveBeenCalledWith('tenant-1', 'BM450');
    expect(context.tool.toolNo).toBe('BM450');
    expect(context.partLists).toHaveLength(1);
    expect(context.drawings).toHaveLength(1);
    expect(context.folders).toHaveLength(1);
  });

  it('resolves a tool record by tool number for findOne', async () => {
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'tool-1', toolNo: 'BM450', toolType: 'BM' });
    const entity = await service.findOne('BM450', 'tenant-1');

    expect(repo.findOne).toHaveBeenNthCalledWith(1, { where: { id: 'BM450', deletedAt: expect.anything(), tenantId: 'tenant-1' } });
    expect(repo.findOne).toHaveBeenNthCalledWith(2, { where: { toolNo: 'BM450', deletedAt: expect.anything(), tenantId: 'tenant-1' } });
    expect(entity.toolNo).toBe('BM450');
  });

  it('falls back to a tool number when no Tool Master row exists', async () => {
    repo.findOne.mockResolvedValue(null);
    engineeringIndexerService.browse.mockResolvedValue([
      { toolNo: 'BM480', itemType: 'folder', fileName: 'BM480', extension: null, relativePath: 'bm480', folderName: 'BM480' },
    ]);

    const context = await service.getEngineeringContext('BM480', 'tenant-1');

    expect(engineeringIndexerService.browse).toHaveBeenCalledWith('tenant-1', 'BM480');
    expect(context.tool.toolNo).toBe('BM480');
    expect(context.tool.toolType).toBe('BM');
    expect(context.folders).toHaveLength(1);
  });
});
