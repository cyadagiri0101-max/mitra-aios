import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringNormalizerService } from './engineering-normalizer.service';
import { KnowledgeCatalogEntry, KnowledgeCatalogEntityType } from '../../knowledge/entities/knowledge-catalog.entity';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

describe('EngineeringNormalizerService (M7.2 Normalization Engine)', () => {
  let service: EngineeringNormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngineeringNormalizerService],
    }).compile();

    service = module.get<EngineeringNormalizerService>(EngineeringNormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Domain Normalization & Header Preservation', () => {
    it('normalizes project_master into a structured Engineering Project Profile', () => {
      const entry = {
        id: 'cat-1',
        tenantId: 'tenant-123',
        entityId: 'proj-uuid-1',
        entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
        title: 'Project BM454: Veedol 600ml Mold',
        sourceDomain: 'MEKB',
        sourceRef: {
          tableName: 'project_master',
          project_number: 'BM454',
          mold_name: 'Veedol 600ml Mold',
          customer_name: 'Veedol',
          machine_name: 'SEB101 FN',
          cavitation: '8-Cavity',
          product_type: 'Bottle',
          resin: 'HDPE',
          prefix: 'BM',
        },
      } as unknown as KnowledgeCatalogEntry;

      const records = service.normalizeCatalogEntry(entry);
      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.entityType).toBe('PROJECT');
      expect(rec.projectNumber).toBe('BM454');
      expect(rec.projectPrefix).toBe('BM');
      expect(rec.customer).toBe('Veedol');
      expect(rec.machine).toBe('SEB101 FN');
      expect(rec.material).toBe('HDPE');
      expect(rec.normalizedText).toContain('=== ENGINEERING PROJECT PROFILE: BM454 ===');
      expect(rec.normalizedText).toContain('Cavitation: 8-Cavity');
    });

    it('normalizes part_list with PRESERVED Markdown BOM Table Headers', () => {
      const entry = {
        id: 'cat-2',
        tenantId: 'tenant-123',
        entityId: 'part-uuid-1',
        entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
        title: 'BOM Part: BODY INSERT',
        sourceDomain: 'MEKB',
        sourceRef: {
          tableName: 'part_list',
          project_number: 'BM454',
          item_number: '1',
          description: 'BODY INSERT- B & P',
          material: 'ALUMINIUM',
          grade: 'HOKOTOL/ALUMOLD1-500',
          finished_sizes: '1230 x 135 x 40',
          qty: 2,
          hardness: '150 HB',
          supplier: 'ALCOA',
        },
      } as unknown as KnowledgeCatalogEntry;

      const records = service.normalizeCatalogEntry(entry);
      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.entityType).toBe('BOM_PART');
      expect(rec.chunkType).toBe('BOM_TABLE');
      expect(rec.normalizedText).toContain('=== ENGINEERING BILL OF MATERIALS (BOM) PART: BODY INSERT- B & P ===');
      // Assert Markdown Table Header is strictly preserved
      expect(rec.normalizedText).toContain('| Project | Item | Description | Material | Grade | Finished Sizes | Qty | Hardness | Supplier |');
      expect(rec.normalizedText).toContain('| BM454 | 1 | BODY INSERT- B & P | ALUMINIUM | HOKOTOL/ALUMOLD1-500 | 1230 x 135 x 40 | 2 | 150 HB | ALCOA |');
    });

    it('normalizes process_planning with PRESERVED Process Sequence Table Headers', () => {
      const entry = {
        id: 'cat-3',
        tenantId: 'tenant-123',
        entityId: 'proc-uuid-1',
        entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
        title: 'Process Step 1: Roughing',
        sourceDomain: 'MEKB',
        sourceRef: {
          tableName: 'process_planning',
          project_number: 'BM454',
          sequence_number: 1,
          stage: 'Manufacturing',
          description: 'CNC ROUGHING - CORE INSERT',
          department: 'CNC Milling',
          duration_hours: 8.5,
        },
      } as unknown as KnowledgeCatalogEntry;

      const records = service.normalizeCatalogEntry(entry);
      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.entityType).toBe('PROCESS_PLAN');
      expect(rec.normalizedText).toContain('=== ENGINEERING PROCESS PLANNING STEP ===');
      expect(rec.normalizedText).toContain('| Project | Step | Stage | Operation | Department | Duration (Hrs) |');
      expect(rec.normalizedText).toContain('| BM454 | 1 | Manufacturing | CNC ROUGHING - CORE INSERT | CNC Milling | 8.5 |');
    });

    it('normalizes cycle_time_history with Cycle Time Benchmark Table', () => {
      const entry = {
        id: 'cat-4',
        tenantId: 'tenant-123',
        entityId: 'cycle-uuid-1',
        entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
        title: 'Cycle Time: SPEEDEX',
        sourceDomain: 'MEKB',
        sourceRef: {
          tableName: 'cycle_time_history',
          machine_name: 'SPEEDEX',
          product_weight: '13.5gm',
          cavitation: '4+4',
          cycle_time: '18 Sec',
          remarks: 'High speed run',
        },
      } as unknown as KnowledgeCatalogEntry;

      const records = service.normalizeCatalogEntry(entry);
      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.entityType).toBe('CYCLE_TIME');
      expect(rec.normalizedText).toContain('=== CYCLE TIME BENCHMARK SPECIFICATION ===');
      expect(rec.normalizedText).toContain('| Machine | Weight | Cavitation | Cycle Time | Remarks |');
    });

    it('normalizes technical Markdown documents preserving provenance and authority', () => {
      const entry = {
        id: 'cat-5',
        tenantId: 'tenant-123',
        entityId: 'doc-uuid-1',
        entityType: KnowledgeCatalogEntityType.KNOWLEDGE,
        title: 'Engineering Data Dictionary',
        sourceDomain: 'DOCUMENT',
        summary: 'Comprehensive dictionary for mold specifications.',
        sourceRef: {
          relativePath: 'docs/EngineeringDataDictionary.md',
          classification: 'ENGINEERING_DOCUMENT',
          authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
          sha256: 'abc123sha',
          provenance: {
            projectNumber: 'BM454',
          },
        },
      } as unknown as KnowledgeCatalogEntry;

      const records = service.normalizeCatalogEntry(entry);
      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.entityType).toBe('TECHNICAL_DOCUMENT');
      expect(rec.authorityStatus).toBe(AuthorityStatus.AUTHORITATIVE_RELEASE);
      expect(rec.normalizedText).toContain('=== TECHNICAL DOCUMENTATION SPECIFICATION: Engineering Data Dictionary ===');
      expect(rec.normalizedText).toContain('Provenance: docs/EngineeringDataDictionary.md (SHA-256: abc123sha)');
    });
  });
});
