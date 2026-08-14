import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectDocumentService } from './project-document.service';
import { ProjectFolder } from '../entities/projectfolder.entity';
import { ProjectDocument, ProjectDocumentStatus } from '../entities/projectdocument.entity';
import { ProjectDocumentVersion } from '../entities/projectdocumentversion.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';
import { MinioService } from '../../storage/minio.service';

describe('ProjectDocumentService', () => {
  let service: ProjectDocumentService;
  let folderRepo: any;
  let documentRepo: any;
  let versionRepo: any;
  let activityRepo: any;
  let eventBus: any;
  let minio: any;

  const doc = {
    id: 'doc-1', projectId: 'p-1', folderId: null, title: 'Mold Drawing', fileName: 'drawing.pdf',
    currentVersion: 1, status: ProjectDocumentStatus.DRAFT, mimeType: null, fileSize: 0,
    deletedAt: null, releasedBy: null, releasedAt: null,
  };

  const makeQb = (rows: any[] = [], count = rows.length) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, count]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
  };

  beforeEach(async () => {
    folderRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((f) => Promise.resolve({ ...f, id: 'f-9' })),
      create: jest.fn((f) => ({ ...f })),
    };
    documentRepo = {
      createQueryBuilder: jest.fn(() => makeQb([doc])),
      findOne: jest.fn().mockImplementation(async () => ({ ...doc, versions: [] })),
      save: jest.fn((d: any) => Promise.resolve({ ...d, id: d.id ?? 'doc-9' })),
      create: jest.fn((d: any) => ({ ...d })),
      count: jest.fn().mockResolvedValue(0),
    };
    versionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((v) => Promise.resolve({ ...v, id: 'v-9' })),
      create: jest.fn((v) => ({ ...v })),
    };
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)) };
    eventBus = { publish: jest.fn() };
    minio = {
      uploadFile: jest.fn(),
      generatePresignedGetUrl: jest.fn().mockResolvedValue({ url: 'https://signed/url' }),
      getDefaultBucket: jest.fn().mockReturnValue('mitra-documents'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectDocumentService,
        { provide: getRepositoryToken(ProjectFolder), useValue: folderRepo },
        { provide: getRepositoryToken(ProjectDocument), useValue: documentRepo },
        { provide: getRepositoryToken(ProjectDocumentVersion), useValue: versionRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: DomainEventBus, useValue: eventBus },
        { provide: MinioService, useValue: minio },
      ],
    }).compile();

    service = module.get(ProjectDocumentService);
  });

  describe('folders', () => {
    it('returns folders with document counts', async () => {
      folderRepo.find.mockResolvedValue([{ id: 'f-1', folderName: 'Drawings', sequence: 1 }]);
      const qb = makeQb([]);
      documentRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getRawMany.mockResolvedValue([{ folderId: 'f-1', count: '3' }]);
      const result = await service.findFolders('p-1', 't-1');
      expect(result[0].documentCount).toBe(3);
    });

    it('creates folders with path and rejects non-empty delete', async () => {
      const saved = await service.createFolder('p-1', { folderName: 'Drawings' }, 'u-1', 't-1');
      expect(saved.folderPath).toBe('/Drawings');
      folderRepo.findOne.mockResolvedValue({ id: 'f-1' });
      documentRepo.count.mockResolvedValue(2);
      await expect(service.removeFolder('f-1', 'u-1', 't-1')).rejects.toThrow(BadRequestException);
      documentRepo.count.mockResolvedValue(0);
      folderRepo.save.mockImplementation((f: any) => Promise.resolve(f));
      const removed = await service.removeFolder('f-1', 'u-1', 't-1');
      expect(removed.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('documents', () => {
    it('creates a document with v1 version, checksum and domain event', async () => {
      documentRepo.save.mockImplementation((d: any) => Promise.resolve({ ...d, id: 'doc-9' }));
      const saved = await service.create(
        'p-1', { title: 'Drawing' },
        { fileName: 'd.pdf', filePath: '/projects/p-1/d.pdf', mimeType: 'application/pdf', fileSize: 10, checksum: 'abc123' },
        'u-1', 'User', 't-1',
      );
      expect(saved.currentVersion).toBe(1);
      expect(versionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-9', versionNumber: 1, checksum: 'abc123' }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.DOCUMENT_UPLOADED }),
      );
    });

    it('rejects folder that does not belong to the project', async () => {
      folderRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('p-1', { title: 'X', folderId: 'f-x' }, { fileName: 'a', filePath: '/a' }, 'u-1', null, 't-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('uploads immutable versions that advance currentVersion', async () => {
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, versions: [] }));
      documentRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      await service.uploadVersion('doc-1', { fileName: 'v2.pdf', filePath: '/x/v2.pdf' }, 'u-1', 'revision', 't-1');
      expect(versionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ versionNumber: 2, notes: 'revision' }));
      expect(documentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ currentVersion: 2, fileName: 'v2.pdf' }));
    });

    it('releases and archives documents with events/activity', async () => {
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, versions: [] }));
      documentRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      const released = await service.release('doc-1', 'approved', 'u-1', 't-1');
      expect(released.status).toBe(ProjectDocumentStatus.RELEASED);
      expect(released.releasedAt).toBeInstanceOf(Date);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.DOCUMENT_RELEASED }),
      );
      const archived = await service.archive('doc-1', 'u-1', 't-1');
      expect(archived.status).toBe(ProjectDocumentStatus.ARCHIVED);
    });

    it('lists versions newest first and soft-deletes documents', async () => {
      versionRepo.find.mockResolvedValue([{ versionNumber: 2 }]);
      await expect(service.versions('doc-1', 't-1')).resolves.toHaveLength(1);
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, versions: [] }));
      documentRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      const result = await service.remove('doc-1', 'u-1', 't-1');
      expect(result.deleted).toBe(true);
    });

    it('throws NotFound for missing document', async () => {
      documentRepo.findOne.mockImplementation(async () => null);
      await expect(service.findOne('nope', 't-1')).rejects.toThrow(NotFoundException);
    });

    it('uploads onto a RELEASED document open a new review cycle (back to DRAFT)', async () => {
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, status: ProjectDocumentStatus.RELEASED, versions: [] }));
      documentRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      await service.uploadVersion('doc-1', { fileName: 'v2.pdf', filePath: '/x/v2.pdf' }, 'u-1', 'revision 2', 't-1');
      expect(documentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentVersion: 2, status: ProjectDocumentStatus.DRAFT }),
      );
    });

    it('rejects releasing an archived or already-released document', async () => {
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, status: ProjectDocumentStatus.ARCHIVED }));
      await expect(service.release('doc-1', null, 'u-1', 't-1')).rejects.toThrow(/archived/i);
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, status: ProjectDocumentStatus.RELEASED }));
      await expect(service.release('doc-1', null, 'u-1', 't-1')).rejects.toThrow(/already released/i);
    });

    it('returns a signed download URL for the current or specific version', async () => {
      documentRepo.findOne.mockImplementation(async () => ({ ...doc, versions: [] }));
      versionRepo.findOne.mockResolvedValue({
        versionNumber: 1, fileName: 'drawing.pdf', filePath: '/projects/p-1/drawing.pdf', mimeType: 'application/pdf', fileSize: 10, checksum: 'abc123',
      });
      const result = await service.download('doc-1', undefined, 't-1');
      expect(result.url).toBe('https://signed/url');
      expect(result.checksumSha256).toBe('abc123');
      expect(minio.generatePresignedGetUrl).toHaveBeenCalledWith('mitra-documents', '/projects/p-1/drawing.pdf', 86400);

      versionRepo.findOne.mockResolvedValue(null);
      await expect(service.download('doc-1', 99, 't-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects tenantless access with 403 (fail closed)', async () => {
      await expect(service.findOne('doc-1', null)).rejects.toThrow(ForbiddenException);
      await expect(service.versions('doc-1', null)).rejects.toThrow(ForbiddenException);
      await expect(service.download('doc-1', undefined, null)).rejects.toThrow(ForbiddenException);
      await expect(service.create('p-1', { title: 'X' }, { fileName: 'x.pdf', filePath: '/x.pdf' }, 'u-1', 'u', null)).rejects.toThrow(ForbiddenException);
    });

    it('rejects creating a folder under a folder of another project', async () => {
      folderRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createFolder('p-1', { folderName: 'Sub', parentFolderId: 'f-x' }, 'u-1', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('builds nested folder paths and rejects duplicate sibling names', async () => {
      folderRepo.findOne
        .mockResolvedValueOnce({ id: 'f-1', folderPath: '/Drawings', projectId: 'p-1' })
        .mockResolvedValueOnce(null);
      const saved = await service.createFolder('p-1', { folderName: 'RevA', parentFolderId: 'f-1' }, 'u-1', 't-1');
      expect(saved.folderPath).toBe('/Drawings/RevA');
      folderRepo.findOne.mockResolvedValue({ id: 'f-2' });
      await expect(
        service.createFolder('p-1', { folderName: 'RevA', parentFolderId: 'f-1' }, 'u-1', 't-1'),
      ).rejects.toThrow(/already exists/i);
    });
  });
});
