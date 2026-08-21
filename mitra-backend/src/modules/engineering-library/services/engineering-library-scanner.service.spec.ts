import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EngineeringLibraryScannerService } from './engineering-library-scanner.service';
import {
  EngineeringAssetClassification,
  AuthorityStatus,
} from '../types/engineering-library-scan.types';

describe('EngineeringLibraryScannerService (M7.0 Governance & Read-Only Scanner)', () => {
  let service: EngineeringLibraryScannerService;
  let tempDir: string;

  beforeAll(() => {
    // Create a temporary fixture directory mimicking a real engineering vault
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mitra-m7-scanner-test-'));

    // 1. Authoritative SQLite database
    fs.mkdirSync(path.join(tempDir, 'database'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'database', 'mekb.sqlite'), 'SQLite format 3\x00mock-db-content');

    // 2. Documentation specs
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'docs', 'EngineeringDataDictionary.md'), '# Engineering Data Dictionary\n| Attribute | Type |\n');
    fs.writeFileSync(path.join(tempDir, 'docs', 'FolderStructureAnalysis.md'), '# Folder Structure Analysis\n');

    // 3. Parsers
    fs.mkdirSync(path.join(tempDir, 'parsers'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'parsers', 'partlist_parser.py'), 'class PartListParser:\n    pass\n');

    // 4. Master workbooks and spreadsheets
    fs.writeFileSync(path.join(tempDir, 'PL.xlsx'), 'MOCK_EXCEL_DATA_PL');
    fs.writeFileSync(path.join(tempDir, 'BM-454 INDEX SHEET.xlsx'), 'MOCK_EXCEL_INDEX_454');
    fs.writeFileSync(path.join(tempDir, 'BM-454 INDEX SHEET(1).xlsx'), 'MOCK_EXCEL_INDEX_454'); // Duplicate content!

    // 5. Revision candidate files
    fs.writeFileSync(path.join(tempDir, 'Blow Molds Data for Internal Study.xlsx'), 'MOCK_INTERNAL_STUDY_BASE');
    fs.writeFileSync(path.join(tempDir, 'Blow Molds Data for Internal Study_RevA.xlsx'), 'MOCK_INTERNAL_STUDY_REVA');

    // 6. Runtime dependency tree to be EXCLUDED (.venv and node_modules)
    fs.mkdirSync(path.join(tempDir, '.venv', 'Lib', 'site-packages'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.venv', 'Lib', 'site-packages', 'pandas.py'), '# pandas stub');
    fs.writeFileSync(path.join(tempDir, '.venv', 'Lib', 'site-packages', 'numpy.pyd'), 'MOCK_BINARY_PYD');

    fs.mkdirSync(path.join(tempDir, 'node_modules', 'typescript', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'typescript', 'lib', 'typescript.js'), 'console.log("tsc");');
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'typescript', 'lib', 'typescript.js.map'), '{"version":3}');

    // 7. Bytecode cache
    fs.mkdirSync(path.join(tempDir, 'parsers', '__pycache__'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'parsers', '__pycache__', 'partlist_parser.cpython-312.pyc'), 'MOCK_PYC');
  });

  afterAll(() => {
    // Clean up temporary fixture directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringLibraryScannerService,
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

    service = module.get<EngineeringLibraryScannerService>(EngineeringLibraryScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Path Governance & Validation', () => {
    it('resolves the configured library path correctly', () => {
      const p = service.resolveLibraryPath();
      expect(p).toBe(path.normalize(tempDir));
    });

    it('validates a valid directory path', () => {
      const res = service.validateLibraryPath(tempDir);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects a non-existent directory path', () => {
      const res = service.validateLibraryPath(path.join(tempDir, 'non_existent_folder_xyz'));
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('does not exist');
    });

    it('rejects a file path when directory is expected', () => {
      const filePath = path.join(tempDir, 'PL.xlsx');
      const res = service.validateLibraryPath(filePath);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('not a directory');
    });
  });

  describe('Streaming SHA-256 Fingerprinting', () => {
    it('computes deterministic SHA-256 for a file', async () => {
      const filePath = path.join(tempDir, 'PL.xlsx');
      const hash1 = await service.computeFileSha256(filePath);
      const hash2 = await service.computeFileSha256(filePath);
      expect(hash1).toBeDefined();
      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);
    });
  });

  describe('File Classification & Domain Provenance', () => {
    it('classifies SQLite database as STRUCTURED_DATABASE with AUTHORITATIVE_RELEASE', () => {
      const res = service.classifyFile('database/mekb.sqlite', 1024);
      expect(res.classification).toBe(EngineeringAssetClassification.STRUCTURED_DATABASE);
      expect(res.isEligible).toBe(true);
      expect(res.authorityStatus).toBe(AuthorityStatus.AUTHORITATIVE_RELEASE);
    });

    it('classifies master workbooks (PL.xlsx) as MASTER_WORKBOOK with CURRENT_WORKING', () => {
      const res = service.classifyFile('PL.xlsx', 2048);
      expect(res.classification).toBe(EngineeringAssetClassification.MASTER_WORKBOOK);
      expect(res.isEligible).toBe(true);
      expect(res.authorityStatus).toBe(AuthorityStatus.CURRENT_WORKING);
    });

    it('classifies markdown specifications in docs/ as ENGINEERING_DOCUMENT', () => {
      const res = service.classifyFile('docs/EngineeringDataDictionary.md', 512);
      expect(res.classification).toBe(EngineeringAssetClassification.ENGINEERING_DOCUMENT);
      expect(res.isEligible).toBe(true);
      expect(res.authorityStatus).toBe(AuthorityStatus.AUTHORITATIVE_RELEASE);
    });

    it('classifies python parsers as PARSER_SOURCE', () => {
      const res = service.classifyFile('parsers/partlist_parser.py', 512);
      expect(res.classification).toBe(EngineeringAssetClassification.PARSER_SOURCE);
      expect(res.isEligible).toBe(true);
    });

    it('excludes runtime dependencies (.venv / node_modules) from eligibility', () => {
      const venvRes = service.classifyFile('.venv/Lib/site-packages/pandas.py', 1024);
      expect(venvRes.classification).toBe(EngineeringAssetClassification.RUNTIME_DEPENDENCY);
      expect(venvRes.isEligible).toBe(false);

      const nodeRes = service.classifyFile('node_modules/typescript/lib/typescript.js', 1024);
      expect(nodeRes.classification).toBe(EngineeringAssetClassification.RUNTIME_DEPENDENCY);
      expect(nodeRes.isEligible).toBe(false);
    });

    it('excludes bytecode cache (__pycache__) and compiled binaries', () => {
      const pycRes = service.classifyFile('parsers/__pycache__/partlist_parser.cpython-312.pyc', 512);
      expect(pycRes.classification).toBe(EngineeringAssetClassification.BINARY_RUNTIME);
      expect(pycRes.isEligible).toBe(false);
    });

    it('extracts domain provenance for project BM454 Veedol', () => {
      const meta = service.extractDomainProvenance('BM454 Veedol 600ml M01 08Cavity Mold SEB101 FN_Partlist_RevA.xlsx');
      expect(meta.projectNumber).toBe('BM454');
      expect(meta.projectPrefix).toBe('BM');
      expect(meta.customer).toBe('Veedol');
      expect(meta.documentType).toBe('PART_LIST_BOM');
      expect(meta.machine).toBe('SEB101');
      expect(meta.revision).toBe('RevA');
    });
  });

  describe('Full Recursive Scan & Manifest Generation', () => {
    it('executes full scan and produces deterministic manifest', async () => {
      const manifest = await service.scanLibrary({ libraryPath: tempDir });

      expect(manifest).toBeDefined();
      expect(manifest.isLibraryConfigured).toBe(true);
      expect(manifest.isLibraryAccessible).toBe(true);
      expect(manifest.totalFiles).toBeGreaterThanOrEqual(10);
      expect(manifest.eligibleFiles).toBeGreaterThanOrEqual(6);
      expect(manifest.excludedFiles).toBeGreaterThanOrEqual(4);

      // Verify sorting determinism: files sorted by relativePath
      for (let i = 1; i < manifest.files.length; i += 1) {
        expect(manifest.files[i - 1].relativePath.localeCompare(manifest.files[i].relativePath)).toBeLessThanOrEqual(0);
      }

      // Verify duplicate detection: BM-454 INDEX SHEET.xlsx and (1).xlsx have identical content
      expect(manifest.duplicateGroups.length).toBeGreaterThanOrEqual(1);
      const dupGroup = manifest.duplicateGroups.find((g) => g.primaryPath.includes('INDEX SHEET'));
      expect(dupGroup).toBeDefined();
      expect(dupGroup?.count).toBe(2);

      // Verify revision candidate grouping
      expect(manifest.revisionCandidateGroups.length).toBeGreaterThanOrEqual(1);
      const revGroup = manifest.revisionCandidateGroups.find((rg) => rg.baseIdentifier.includes('Internal Study'));
      expect(revGroup).toBeDefined();
      expect(revGroup?.candidatePaths.length).toBe(2);
    });

    it('generates valid JSON manifest string', async () => {
      const manifest = await service.scanLibrary({ libraryPath: tempDir });
      const jsonStr = service.generateManifestJson(manifest);
      expect(typeof jsonStr).toBe('string');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.scanBatchId).toBe(manifest.scanBatchId);
      expect(parsed.totalFiles).toBe(manifest.totalFiles);
    });

    it('generates rich human-readable markdown scan report', async () => {
      const manifest = await service.scanLibrary({ libraryPath: tempDir });
      const mdReport = service.generateScanReportMarkdown(manifest);
      expect(typeof mdReport).toBe('string');
      expect(mdReport).toContain('# M7 — Engineering Knowledge Library Scan Report');
      expect(mdReport).toContain('Executive Metrics');
      expect(mdReport).toContain('Classification Breakdown');
      expect(mdReport).toContain('Authority Classification');
      expect(mdReport).toContain('Duplicate Groups Summary');
    });

    it('guarantees source library remains completely read-only', async () => {
      const beforeFiles = fs.readdirSync(tempDir);
      const beforeStats = beforeFiles.map((f) => fs.statSync(path.join(tempDir, f)).mtimeMs);

      await service.scanLibrary({ libraryPath: tempDir });

      const afterFiles = fs.readdirSync(tempDir);
      const afterStats = afterFiles.map((f) => fs.statSync(path.join(tempDir, f)).mtimeMs);

      expect(afterFiles).toEqual(beforeFiles);
      expect(afterStats).toEqual(beforeStats);
    });
  });
});
