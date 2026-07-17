import { EngineeringFileIndexController } from './engineering-file-indexer.controller';

describe('EngineeringFileIndexController', () => {
  it('returns indexed records from GET /engineering-file-index', async () => {
    const records = [{ id: '1', toolNo: 'BM450', itemType: 'folder', relativePath: 'BM450' }];
    const service = {
      browse: jest.fn().mockResolvedValue(records),
    };
    const controller = new EngineeringFileIndexController(service as any);

    await expect(controller.list('BM450', undefined, { tenantId: 'tenant-1' } as any)).resolves.toBe(records);
    expect(service.browse).toHaveBeenCalledWith('tenant-1', 'BM450', undefined);
  });
});
