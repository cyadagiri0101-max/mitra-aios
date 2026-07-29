/**
 * Shared spec for all services that extend TenantAwareService.
 *
 * These services add no logic of their own — they inherit all behaviour from
 * TenantAwareService. A single parameterised test suite covers:
 *   - findAll(): pagination, tenant scoping, deletedAt filter
 *   - findOne(): IDOR protection (cross-tenant returns 404)
 *   - create(): entity is created with tenantId and userId stamped
 *   - update(): delegates to findOne (isolation) then saves
 *   - remove(): soft-deletes by setting deletedAt
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

// ── Shared factory ───────────────────────────────────────────────────────────
function makeRepo() {
  return {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne:      jest.fn().mockResolvedValue(null),
    count:        jest.fn().mockResolvedValue(0),
    create:       jest.fn((d: any) => ({ ...d })),
    save:         jest.fn((e: any) => Promise.resolve({ id: 'ent-1', ...e })),
  };
}

/** Bootstraps a TenantAwareService subclass under test with a mocked repo. */
async function buildService<S>(ServiceClass: new (...a: any[]) => S, EntityClass: any): Promise<{
  service: S;
  repo: ReturnType<typeof makeRepo>;
}> {
  const repo = makeRepo();
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ServiceClass,
      { provide: getRepositoryToken(EntityClass), useValue: repo },
    ],
  }).compile();
  return { service: module.get<S>(ServiceClass), repo };
}

// ── Import all services and their entities ───────────────────────────────────
import { NoteService }               from '@modules/collaboration/services/note.service';
import { Note }                      from '@modules/collaboration/entities/note.entity';

import { EnquiryService }            from '@modules/commercial/services/enquiry.service';
import { Enquiry }                   from '@modules/commercial/entities/enquiry.entity';

import { CpsReviewService }          from '@modules/cps/services/cpsreview.service';
import { CPSReview }                 from '@modules/cps/entities/cpsreview.entity';

import { CustomerApprovalService }   from '@modules/customer/services/customerapproval.service';
import { CustomerApproval }          from '@modules/customer/entities/customerapproval.entity';

import { DesignPartService }         from '@modules/design/services/designpart.service';
import { DesignPart }                from '@modules/design/entities/designpart.entity';

import { DocumentVersionService }    from '@modules/document/services/documentversion.service';
import { DocumentVersion }           from '@modules/document/entities/documentversion.entity';

import { KnowledgeArticleService }   from '@modules/knowledge/services/knowledgearticle.service';
import { KnowledgeArticle }          from '@modules/knowledge/entities/knowledgearticle.entity';

import { MachineTypeService }        from '@modules/machine/services/machinetype.service';
import { MachineType }               from '@modules/machine/entities/machinetype.entity';

import { WorkOrderService }          from '@modules/manufacturing/services/workorder.service';
import { WorkOrder }                 from '@modules/manufacturing/entities/workorder.entity';

import { MoldStructureService }      from '@modules/mold/services/moldstructure.service';
import { MoldStructure }             from '@modules/mold/entities/moldstructure.entity';

import { SearchIndexService }        from '@modules/search/services/searchindex.service';
import { SearchIndex }               from '@modules/search/entities/searchindex.entity';

// ── Parameterised test runner ─────────────────────────────────────────────────
const SERVICES: [string, any, any][] = [
  ['NoteService',             NoteService,             Note            ],
  ['EnquiryService',          EnquiryService,          Enquiry         ],
  ['CpsReviewService',        CpsReviewService,        CPSReview       ],
  ['CustomerApprovalService', CustomerApprovalService, CustomerApproval],
  ['DesignPartService',       DesignPartService,       DesignPart      ],
  ['DocumentVersionService',  DocumentVersionService,  DocumentVersion ],
  ['KnowledgeArticleService', KnowledgeArticleService, KnowledgeArticle],
  ['MachineTypeService',      MachineTypeService,      MachineType     ],
  ['WorkOrderService',        WorkOrderService,        WorkOrder       ],
  ['MoldStructureService',    MoldStructureService,    MoldStructure   ],
  ['SearchIndexService',      SearchIndexService,      SearchIndex     ],
];

describe.each(SERVICES)('%s (TenantAwareService)', (name, ServiceClass, EntityClass) => {
  let service: any;
  let repo:    ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    ({ service, repo } = await buildService(ServiceClass, EntityClass));
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('paginates with default page=1 limit=20', async () => {
      repo.findAndCount.mockResolvedValue([[{ id: 'e1' }], 1]);
      const result = await service.findAll('tenant-1');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('scopes query to tenantId when provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('tenant-abc', 2, 10);
      const [opts] = repo.findAndCount.mock.calls[0];
      expect(opts.where.tenantId).toBe('tenant-abc');
      expect(opts.skip).toBe(10);
      expect(opts.take).toBe(10);
    });

    it('does not scope to tenant when tenantId is undefined', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(undefined);
      const [opts] = repo.findAndCount.mock.calls[0];
      expect(opts.where.tenantId).toBeUndefined();
    });

    it('always filters by deletedAt: IsNull()', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll('t-1');
      const [opts] = repo.findAndCount.mock.calls[0];
      expect(opts.where.deletedAt).toBeDefined();
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('throws NotFoundException when entity does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('no-such-id', 'tenant-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('returns entity when tenantId matches', async () => {
      const entity = { id: 'e-1', tenantId: 'tenant-1' };
      repo.findOne.mockResolvedValue(entity);
      const result = await service.findOne('e-1', 'tenant-1');
      expect(result).toBe(entity);
    });

    it('throws NotFoundException (404) when tenantId does not match — IDOR protection', async () => {
      const entity = { id: 'e-1', tenantId: 'tenant-OTHER' };
      repo.findOne.mockResolvedValue(entity);
      await expect(service.findOne('e-1', 'tenant-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('returns entity regardless of tenantId when tenantId is null (super-admin path)', async () => {
      const entity = { id: 'e-1', tenantId: 'any-tenant' };
      repo.findOne.mockResolvedValue(entity);
      const result = await service.findOne('e-1', null);
      expect(result).toBe(entity);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('stamps tenantId and userId on the new entity', async () => {
      await service.create({ name: 'Test' }, 'user-1', 'tenant-1');
      const created = repo.create.mock.calls[0][0];
      expect(created.tenantId).toBe('tenant-1');
      expect(created.createdBy).toBe('user-1');
      expect(created.updatedBy).toBe('user-1');
    });

    it('persists with repo.save()', async () => {
      await service.create({ name: 'Test' }, 'user-1', 'tenant-1');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('throws NotFoundException when entity not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('no-id', { name: 'X' }, 'user-1', 'tenant-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('saves updated entity with updatedBy stamped', async () => {
      const entity = { id: 'e-1', tenantId: 'tenant-1', name: 'Old' };
      repo.findOne.mockResolvedValue(entity);
      await service.update('e-1', { name: 'New' }, 'user-2', 'tenant-1');
      const saved = repo.save.mock.calls[0][0];
      expect(saved.name).toBe('New');
      expect(saved.updatedBy).toBe('user-2');
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('throws NotFoundException when entity not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('no-id', 'user-1', 'tenant-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('soft-deletes by setting deletedAt and returns {deleted: true}', async () => {
      const entity = { id: 'e-1', tenantId: 'tenant-1' };
      repo.findOne.mockResolvedValue(entity);
      const result = await service.remove('e-1', 'user-1', 'tenant-1');
      const saved = repo.save.mock.calls[0][0];
      expect(saved.deletedAt).toBeInstanceOf(Date);
      expect(saved.updatedBy).toBe('user-1');
      expect(result).toEqual({ deleted: true, id: 'e-1' });
    });

    it('enforces tenant isolation before deleting — cross-tenant throws 404', async () => {
      const entity = { id: 'e-1', tenantId: 'tenant-OTHER' };
      repo.findOne.mockResolvedValue(entity);
      await expect(service.remove('e-1', 'user-1', 'tenant-1'))
        .rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
