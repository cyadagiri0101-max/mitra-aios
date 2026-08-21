import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseSync } from 'node:sqlite';
import { MekbIngestionService } from './mekb-ingestion.service';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { KnowledgeCatalogEntry } from '../../knowledge/entities/knowledge-catalog.entity';

describe('MekbIngestionService (M7.1 SQLite Ingestion & Idempotency)', () => {
  let service: MekbIngestionService;
  let tempDir: string;
  let dbPath: string;

  // In-memory mock repositories
  let mockSources: KnowledgeSource[] = [];
  let mockCatalog: KnowledgeCatalogEntry[] = [];

  const mockSourceRepo = {
    create: jest.fn((dto) => ({ id: `src-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockSources.findIndex((s) => s.id === entity.id);
      if (idx >= 0) {
        mockSources[idx] = entity;
      } else {
        mockSources.push(entity);
      }
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockSources.find((s) => {
        return Object.entries(where).every(([k, v]) => (s as any)[k] === v);
      }) || null;
    }),
    find: jest.fn(async ({ where }) => {
      return mockSources.filter((s) => {
        return Object.entries(where).every(([k, v]) => (s as any)[k] === v);
      });
    }),
  };

  const mockCatalogRepo = {
    create: jest.fn((dto) => ({ id: `cat-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockCatalog.findIndex((c) => c.entityId === entity.entityId && c.tenantId === entity.tenantId);
      if (idx >= 0) {
        mockCatalog[idx] = entity;
      } else {
        mockCatalog.push(entity);
      }
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockCatalog.find((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      }) || null;
    }),
    find: jest.fn(async ({ where }) => {
      return mockCatalog.filter((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      });
    }),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb) => {
      const manager = {
        getRepository: jest.fn((entity) => {
          if (entity === KnowledgeCatalogEntry) return mockCatalogRepo;
          return mockSourceRepo;
        }),
      };
      return cb(manager);
    }),
  };

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mitra-m7-mekb-test-'));
    dbPath = path.join(tempDir, 'mekb.sqlite');

    // Create a mock SQLite database with representative tables
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE project_master (
        id INTEGER PRIMARY KEY,
        project_number TEXT UNIQUE,
        mold_name TEXT,
        customer_name TEXT,
        machine_name TEXT,
        prefix TEXT,
        cavitation TEXT,
        product_type TEXT,
        resin TEXT
      );
      INSERT INTO project_master (id, project_number, mold_name, customer_name, machine_name, prefix, cavitation, product_type, resin)
      VALUES (1, 'BM454', 'Veedol 600ml Mold', 'Veedol', 'SEB101 FN', 'BM', '8-Cavity', 'Bottle', 'HDPE');
      INSERT INTO project_master (id, project_number, mold_name, customer_name, machine_name, prefix, cavitation, product_type, resin)
      VALUES (2, 'IM102', 'Shampoo Cap Mold', 'Dabur', 'Engel 150T', 'IM', '16-Cavity', 'Cap', 'PP');

      CREATE TABLE cycle_time_history (
        id INTEGER PRIMARY KEY,
        machine_name TEXT,
        product_weight TEXT,
        cavitation TEXT,
        cycle_time TEXT,
        remarks TEXT
      );
      INSERT INTO cycle_time_history (id, machine_name, product_weight, cavitation, cycle_time, remarks)
      VALUES (1, 'SPEEDEX', '13.5gm', '4+4', '18 Sec', 'Running Cycle Times');

      CREATE TABLE part_list (
        id INTEGER PRIMARY KEY,
        project_number TEXT,
        description TEXT,
        material TEXT,
        grade TEXT,
        finished_sizes TEXT,
        qty INTEGER
      );
      INSERT INTO part_list (id, project_number, description, material, grade, finished_sizes, qty)
      VALUES (1, 'BM454', 'BODY INSERT- B & P', 'ALUMINIUM', 'HOKOTOL/ALUMOLD1-500', '1230 x 135 x 40', 2);
    `);
    db.close();
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(async () => {
    mockSources = [];
    mockCatalog = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MekbIngestionService,
        { provide: getRepositoryToken(KnowledgeSource), useValue: mockSourceRepo },
        { provide: getRepositoryToken(KnowledgeCatalogEntry), useValue: mockCatalogRepo },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'MITRA_ENGINEERING_LIBRARY_PATH') return tempDir;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MekbIngestionService>(MekbIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Read-Only Database Ingestion & Deterministic Mapping', () => {
    it('ingests tables and generates deterministic entity IDs on First Run', async () => {
      const tenantA = '11111111-1111-1111-1111-111111111111';
      const result = await service.ingestMekbDatabase(tenantA, { sqlitePath: dbPath });

      expect(result).toBeDefined();
      expect(result.totalTables).toBe(3);
      expect(result.totalRowsRead).toBe(4); // 2 projects + 1 cycle time + 1 part
      expect(result.recordsCreated).toBe(4);
      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsSkipped).toBe(0);

      // Verify KnowledgeSource record was created
      const source = mockSources.find((s) => s.tenantId === tenantA && s.relativePath === 'database/mekb.sqlite');
      expect(source).toBeDefined();
      expect(source?.sourceType).toBe('MEKB_DATABASE');

      // Verify KnowledgeCatalogEntry records
      const catalogEntries = mockCatalog.filter((c) => c.tenantId === tenantA);
      expect(catalogEntries.length).toBe(4);

      const bm454 = catalogEntries.find((c) => c.title.startsWith('Project BM454'));
      expect(bm454).toBeDefined();
      expect(bm454?.sourceDomain).toBe('MEKB');
      expect(bm454?.tags).toContain('PREFIX:BM');
      expect(bm454?.tags).toContain('CUSTOMER:Veedol');
    });

    it('guarantees IDEMPOTENCY on Second Run (0 created, 0 updated, all skipped)', async () => {
      const tenantA = '11111111-1111-1111-1111-111111111111';

      // First run
      const run1 = await service.ingestMekbDatabase(tenantA, { sqlitePath: dbPath });
      expect(run1.recordsCreated).toBe(4);
      expect(run1.recordsSkipped).toBe(0);

      // Second run with identical database
      const run2 = await service.ingestMekbDatabase(tenantA, { sqlitePath: dbPath });
      expect(run2.recordsCreated).toBe(0);
      expect(run2.recordsUpdated).toBe(0);
      expect(run2.recordsSkipped).toBe(4);
      expect(mockCatalog.length).toBe(4); // No uncontrolled duplicate growth!
    });

    it('enforces strict multi-tenant isolation (Tenant A vs Tenant B)', async () => {
      const tenantA = '11111111-1111-1111-1111-111111111111';
      const tenantB = '22222222-2222-2222-2222-222222222222';

      await service.ingestMekbDatabase(tenantA, { sqlitePath: dbPath });
      await service.ingestMekbDatabase(tenantB, { sqlitePath: dbPath });

      const tenantAEntries = mockCatalog.filter((c) => c.tenantId === tenantA);
      const tenantBEntries = mockCatalog.filter((c) => c.tenantId === tenantB);

      expect(tenantAEntries.length).toBe(4);
      expect(tenantBEntries.length).toBe(4);

      // IDs should differ between tenants because tenantId is part of deterministic hash
      expect(tenantAEntries[0].entityId).not.toEqual(tenantBEntries[0].entityId);
    });

    it('throws NotFoundException when SQLite database file is missing', async () => {
      await expect(
        service.ingestMekbDatabase('11111111-1111-1111-1111-111111111111', {
          sqlitePath: path.join(tempDir, 'non_existent.sqlite'),
        }),
      ).rejects.toThrow('MEKB SQLite database not found');
    });
  });
});
