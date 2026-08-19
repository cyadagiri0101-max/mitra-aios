import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EngineeringBomService } from './engineering-bom.service';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringBomItem } from '../entities/engineering-bom-item.entity';
import { EngineeringBomRevision } from '../entities/engineering-bom-revision.entity';
import { EngineeringBomSubstitution } from '../entities/engineering-bom-substitution.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { OutboxService } from '../../platform/services/outbox.service';

describe('BOM Revision Diff & Cost Rollup (G6 Scenario)', () => {
  let service: EngineeringBomService;
  let bomRepo: any;
  let itemRepo: any;
  let revisionRepo: any;

  const mockTenantId = 'tenant-uuid-1';

  beforeEach(async () => {
    bomRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((e) => e),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    revisionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((e) => e),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringBomService,
        { provide: getRepositoryToken(EngineeringBom), useValue: bomRepo },
        { provide: getRepositoryToken(EngineeringBomItem), useValue: itemRepo },
        { provide: getRepositoryToken(EngineeringBomRevision), useValue: revisionRepo },
        { provide: getRepositoryToken(EngineeringBomSubstitution), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: WorkflowService, useValue: {} },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: EngineeringEventBus, useValue: { publish: jest.fn() } },
        { provide: EngineeringAiHooksService, useValue: { dispatchEvent: jest.fn().mockResolvedValue(undefined) } },
        { provide: OutboxService, useValue: {} },
      ],
    }).compile();

    service = module.get<EngineeringBomService>(EngineeringBomService);
  });

  it('should compute deterministic ADDED, REMOVED, MODIFIED, UNCHANGED diff and cost deltas', async () => {
    const bomId = 'bom-uuid-101';

    bomRepo.findOne.mockResolvedValue({
      id: bomId,
      bomNumber: 'BOM-2026-0001',
      tenantId: mockTenantId,
    });

    const revA = {
      id: 'rev-a',
      bomId,
      revision: 'A',
      versionNumber: 1,
      totalCost: 10000,
      snapshot: {
        items: [
          {
            partNumber: 'MOLD-BASE-01',
            partName: 'Standard 2 Plate Mold Base',
            itemType: 'ASSEMBLY',
            quantityPer: 1,
            quantity: 1,
            uom: 'EA',
            unitCost: 5000,
            material: 'P20 Steel',
          },
          {
            partNumber: 'CAV-CORE-01',
            partName: 'Cavity Core Insert Set',
            itemType: 'PART',
            quantityPer: 2,
            quantity: 2,
            uom: 'SET',
            unitCost: 2000,
            material: 'H13 Hardened Steel',
          },
          {
            partNumber: 'EJ-PIN-01',
            partName: 'Ejector Pin 6mm (Obsolete)',
            itemType: 'PART',
            quantityPer: 10,
            quantity: 10,
            uom: 'EA',
            unitCost: 100,
            material: 'SKD61',
          },
        ],
      },
    };

    const revB = {
      id: 'rev-b',
      bomId,
      revision: 'B',
      versionNumber: 2,
      totalCost: 12500,
      snapshot: {
        items: [
          // UNCHANGED
          {
            partNumber: 'MOLD-BASE-01',
            partName: 'Standard 2 Plate Mold Base',
            itemType: 'ASSEMBLY',
            quantityPer: 1,
            quantity: 1,
            uom: 'EA',
            unitCost: 5000,
            material: 'P20 Steel',
          },
          // MODIFIED (Quantity increased from 2 to 4, unit cost remains 2000)
          {
            partNumber: 'CAV-CORE-01',
            partName: 'Cavity Core Insert Set',
            itemType: 'PART',
            quantityPer: 4,
            quantity: 4,
            uom: 'SET',
            unitCost: 2000,
            material: 'H13 Hardened Steel',
          },
          // ADDED (New high-durability ejector sleeve)
          {
            partNumber: 'EJ-SLEEVE-02',
            partName: 'Ejector Sleeve 8mm DLC Coated',
            itemType: 'PART',
            quantityPer: 8,
            quantity: 8,
            uom: 'EA',
            unitCost: 250,
            material: 'DLC SKD61',
          },
        ],
      },
    };

    revisionRepo.findOne
      .mockResolvedValueOnce(revA)
      .mockResolvedValueOnce(revB);

    const diff = await service.compareRevisions(bomId, 'A', 'B', mockTenantId);

    expect(diff.bomId).toBe(bomId);
    expect(diff.revisionA.revision).toBe('A');
    expect(diff.revisionB.revision).toBe('B');

    // Summary counts
    expect(diff.summary.addedCount).toBe(1);
    expect(diff.summary.removedCount).toBe(1);
    expect(diff.summary.modifiedCount).toBe(1);
    expect(diff.summary.unchangedCount).toBe(1);

    // Cost deltas
    expect(diff.summary.previousTotalCost).toBe(10000);
    expect(diff.summary.newTotalCost).toBe(12500);
    expect(diff.summary.costDelta).toBe(2500);
    expect(diff.summary.costDeltaPercentage).toBe(25);

    // Specific detail verification
    expect(diff.details.added[0].partNumber).toBe('EJ-SLEEVE-02');
    expect(diff.details.removed[0].partNumber).toBe('EJ-PIN-01');
    expect(diff.details.modified[0].itemA.partNumber).toBe('CAV-CORE-01');
    expect(diff.details.quantityChanges[0]).toEqual(
      expect.objectContaining({
        partNumber: 'CAV-CORE-01',
        fromQty: 2,
        toQty: 4,
      }),
    );
  });
});
