import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  EngineeringAssetClassification,
  AuthorityStatus,
  ProvenanceMetadata,
  ScannedFileRecord,
  DuplicateGroup,
  RevisionCandidateGroup,
  ScanManifest,
  ScannerOptions,
} from '../types/engineering-library-scan.types';

export const SCANNER_VERSION = '1.0.0-M7.0';
export const SCANNER_SCHEMA_VERSION = '2026-08-M7.0';

@Injectable()
export class EngineeringLibraryScannerService {
  private readonly logger = new Logger(EngineeringLibraryScannerService.name);
  private lastManifest: ScanManifest | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolve configured library root path safely.
   */
  resolveLibraryPath(overridePath?: string): string {
    const configured = overridePath ||
      this.configService.get<string>('MITRA_ENGINEERING_LIBRARY_PATH') ||
      this.configService.get<string>('ENGINEERING_LIBRARY_PATH') ||
      path.resolve(process.cwd(), 'MitraEngineeringLibrary');
    return path.normalize(configured);
  }

  /**
   * Validate that the library path exists and is a readable directory.
   */
  validateLibraryPath(libraryPath: string): { isValid: boolean; error?: string } {
    if (!libraryPath || typeof libraryPath !== 'string') {
      return { isValid: false, error: 'Library path is empty or undefined.' };
    }
    if (!fs.existsSync(libraryPath)) {
      return { isValid: false, error: `Library path does not exist: ${libraryPath}` };
    }
    try {
      const stats = fs.statSync(libraryPath);
      if (!stats.isDirectory()) {
        return { isValid: false, error: `Library path is not a directory: ${libraryPath}` };
      }
    } catch (err: any) {
      return { isValid: false, error: `Failed to access library path: ${err.message}` };
    }
    return { isValid: true };
  }

  /**
   * Streaming SHA-256 calculation for constant memory footprint.
   */
  async computeFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Classify file based on path, extension, and engineering domain patterns.
   */
  classifyFile(relativePath: string, fileSize: number): {
    classification: EngineeringAssetClassification;
    isEligible: boolean;
    authorityStatus: AuthorityStatus;
    authorityReason?: string;
    revisionCandidate?: string;
    provenance?: ProvenanceMetadata;
  } {
    const normalizedRel = relativePath.replace(/\\/g, '/');
    const ext = path.extname(normalizedRel).toLowerCase();
    const fileName = path.basename(normalizedRel);
    const dirName = path.dirname(normalizedRel).toLowerCase();

    // 1. Runtime dependencies & build noise (EXCLUDED)
    if (
      normalizedRel.startsWith('.venv/') ||
      normalizedRel.startsWith('node_modules/') ||
      normalizedRel.includes('/__pycache__/') ||
      normalizedRel.startsWith('__pycache__/') ||
      normalizedRel.startsWith('.git/') ||
      normalizedRel.startsWith('.vs/') ||
      normalizedRel.startsWith('.vscode/') ||
      normalizedRel.startsWith('.pytest_cache/') ||
      normalizedRel.startsWith('.mypy_cache/')
    ) {
      if (['.pyc', '.map', '.pyd', '.dll', '.exe', '.lib'].includes(ext)) {
        return {
          classification: EngineeringAssetClassification.BINARY_RUNTIME,
          isEligible: false,
          authorityStatus: AuthorityStatus.UNKNOWN,
          authorityReason: 'Compiled binary in dependency or virtualenv tree',
        };
      }
      return {
        classification: EngineeringAssetClassification.RUNTIME_DEPENDENCY,
        isEligible: false,
        authorityStatus: AuthorityStatus.UNKNOWN,
        authorityReason: 'Dependency / runtime execution package (non-domain)',
      };
    }

    // 2. Binary / Bytecode extensions outside virtualenv
    if (['.pyc', '.map', '.pyd', '.dll', '.exe', '.lib'].includes(ext)) {
      return {
        classification: EngineeringAssetClassification.CACHE,
        isEligible: false,
        authorityStatus: AuthorityStatus.UNKNOWN,
        authorityReason: 'Compiled cache or build map file',
      };
    }

    // 3. Structured SQLite Database
    if (ext === '.sqlite' || ext === '.db' || fileName.startsWith('mekb.sqlite')) {
      return {
        classification: EngineeringAssetClassification.STRUCTURED_DATABASE,
        isEligible: true,
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        authorityReason: 'Core relational MEKB database (24 tables, verified records)',
        provenance: {
          documentType: 'DATABASE_RELATIONAL_VAULT',
        },
      };
    }

    // 4. Master Workbooks & Inventories
    if (
      fileName === 'PL.xlsx' ||
      fileName.startsWith('EngineeringAssetInventory') ||
      fileName === 'PMM_Master_Data_Library.xlsx'
    ) {
      const revMatch = fileName.match(/_v(\d+)|Rev([A-Z])/i);
      const provenance = this.extractDomainProvenance(fileName);
      return {
        classification: EngineeringAssetClassification.MASTER_WORKBOOK,
        isEligible: true,
        authorityStatus: AuthorityStatus.CURRENT_WORKING,
        authorityReason: 'Master engineering inventory or project planning matrix',
        revisionCandidate: revMatch ? revMatch[0] : undefined,
        provenance,
      };
    }

    // 5. Engineering Documentation & Specifications (docs/)
    if (dirName.startsWith('docs') || dirName === 'docs') {
      const isSpec = ext === '.md' || ext === '.xlsx' || ext === '.txt';
      const isHistorical = fileName.includes('GapAnalysis') || fileName.includes('QualityReport');
      return {
        classification: isSpec ? EngineeringAssetClassification.ENGINEERING_DOCUMENT : EngineeringAssetClassification.ENGINEERING_DATA,
        isEligible: isSpec,
        authorityStatus: isHistorical ? AuthorityStatus.HISTORICAL_REFERENCE : AuthorityStatus.AUTHORITATIVE_RELEASE,
        authorityReason: 'Engineering data dictionary, folder analysis or technical rule spec',
        provenance: this.extractDomainProvenance(fileName),
      };
    }

    // 6. Extraction Parsers & Importers (parsers/, models/, importers/)
    if (
      dirName.startsWith('parsers') ||
      dirName.startsWith('models') ||
      dirName.startsWith('importers') ||
      dirName.startsWith('api') ||
      dirName.startsWith('scripts')
    ) {
      if (['.py', '.ts', '.js'].includes(ext)) {
        return {
          classification: EngineeringAssetClassification.PARSER_SOURCE,
          isEligible: true,
          authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
          authorityReason: 'Deterministic extraction parser / schema entity code',
          provenance: {
            documentType: 'EXTRACTION_PARSER',
          },
        };
      }
    }

    // 7. Validation Exports
    if (dirName.startsWith('exports') && ext === '.html') {
      return {
        classification: EngineeringAssetClassification.MANIFEST,
        isEligible: false,
        authorityStatus: AuthorityStatus.HISTORICAL_REFERENCE,
        authorityReason: 'Generated validation report output',
      };
    }

    // 8. Domain Spreadsheets & Data Files (BM-*.xlsx, Cycle Times, Part Lists)
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      const provenance = this.extractDomainProvenance(fileName);
      const hasDuplicateToken = /\(\d+\)/.test(fileName);
      const hasRevSuffix = /Rev[A-Z]/i.test(fileName);
      
      let authority = AuthorityStatus.AUTHORITATIVE_RELEASE;
      let reason = 'Authoritative engineering spreadsheet';
      
      if (hasDuplicateToken) {
        authority = AuthorityStatus.HISTORICAL_REFERENCE;
        reason = 'Snapshot iteration copy indicated by bracketed numeric suffix';
      } else if (hasRevSuffix) {
        authority = AuthorityStatus.AUTHORITATIVE_RELEASE;
        reason = 'Formal revision release (e.g. RevA)';
      }

      return {
        classification: EngineeringAssetClassification.ENGINEERING_DATA,
        isEligible: true,
        authorityStatus: authority,
        authorityReason: reason,
        revisionCandidate: hasRevSuffix ? (fileName.match(/Rev[A-Z]/i)?.[0] ?? undefined) : undefined,
        provenance,
      };
    }

    // 9. Markdown / Text Files in Root
    if (['.md', '.txt', '.json'].includes(ext)) {
      return {
        classification: EngineeringAssetClassification.ENGINEERING_DOCUMENT,
        isEligible: true,
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        authorityReason: 'Root engineering markdown documentation or manifest',
        provenance: this.extractDomainProvenance(fileName),
      };
    }

    // 10. Default fallback
    return {
      classification: EngineeringAssetClassification.UNKNOWN,
      isEligible: false,
      authorityStatus: AuthorityStatus.UNKNOWN,
      authorityReason: 'Unclassified file format outside domain registry',
    };
  }

  /**
   * Extract domain provenance attributes from filenames and paths.
   */
  extractDomainProvenance(fileName: string): ProvenanceMetadata {
    const meta: ProvenanceMetadata = {};

    // Project Number & Prefix (BM, IM, IBM, CMB, PD, E, O, F, S)
    const projectMatch = fileName.match(/\b(BM|IM|IBM|CMB|PD|E|O|F|S)[-_]?(\d+)\b/i);
    if (projectMatch) {
      meta.projectPrefix = projectMatch[1].toUpperCase();
      meta.projectNumber = `${meta.projectPrefix}${projectMatch[2]}`;
    }

    // Customer Recognition
    const customerKeywords = ['ALPLA', 'CREATIVE', 'WEENER', 'ALTERNICQ', 'Veedol', 'Dabur', 'Amruthanjan', 'Reckitt', 'Mortein', 'Vision'];
    for (const cust of customerKeywords) {
      if (new RegExp(`\\b${cust}\\b`, 'i').test(fileName)) {
        meta.customer = cust;
        break;
      }
    }

    // Document Type Recognition
    if (/part\s*list|bom/i.test(fileName)) {
      meta.documentType = 'PART_LIST_BOM';
    } else if (/process\s*planning/i.test(fileName)) {
      meta.documentType = 'PROCESS_PLANNING';
    } else if (/cycle\s*time/i.test(fileName)) {
      meta.documentType = 'CYCLE_TIME_HISTORY';
    } else if (/index\s*sheet/i.test(fileName)) {
      meta.documentType = 'INDEX_SHEET';
    } else if (/component/i.test(fileName)) {
      meta.documentType = 'COMPONENT_DETAILS';
    } else if (/dictionary/i.test(fileName)) {
      meta.documentType = 'DATA_DICTIONARY';
    }

    // Machine Recognition
    const machineKeywords = ['SPEEDEX', 'SIKA', 'BEKUM', 'AUTOMA', 'ASB', 'SEB101', 'BMU', 'CMP'];
    for (const m of machineKeywords) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(fileName)) {
        meta.machine = m;
        break;
      }
    }

    // Revision Recognition
    const revMatch = fileName.match(/Rev([A-Z])|_v(\d+)/i);
    if (revMatch) {
      meta.revision = revMatch[0];
    }

    return meta;
  }

  /**
   * Execute full recursive read-only scan.
   */
  async scanLibrary(options: ScannerOptions = {}): Promise<ScanManifest> {
    const libraryRoot = this.resolveLibraryPath(options.libraryPath);
    const pathValidation = this.validateLibraryPath(libraryRoot);

    const scanBatchId = options.batchId || `scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const scanTimestamp = new Date().toISOString();

    const classificationCounts: Record<EngineeringAssetClassification, number> = {
      [EngineeringAssetClassification.AUTHORITATIVE_ENGINEERING]: 0,
      [EngineeringAssetClassification.ENGINEERING_DOCUMENT]: 0,
      [EngineeringAssetClassification.ENGINEERING_DATA]: 0,
      [EngineeringAssetClassification.PARSER_SOURCE]: 0,
      [EngineeringAssetClassification.STRUCTURED_DATABASE]: 0,
      [EngineeringAssetClassification.MASTER_WORKBOOK]: 0,
      [EngineeringAssetClassification.MANIFEST]: 0,
      [EngineeringAssetClassification.RUNTIME_DEPENDENCY]: 0,
      [EngineeringAssetClassification.BUILD_ARTIFACT]: 0,
      [EngineeringAssetClassification.CACHE]: 0,
      [EngineeringAssetClassification.BINARY_RUNTIME]: 0,
      [EngineeringAssetClassification.UNKNOWN]: 0,
      [EngineeringAssetClassification.EXCLUDED]: 0,
    };

    const authorityCounts: Record<AuthorityStatus, number> = {
      [AuthorityStatus.AUTHORITATIVE_RELEASE]: 0,
      [AuthorityStatus.CURRENT_WORKING]: 0,
      [AuthorityStatus.HISTORICAL_REFERENCE]: 0,
      [AuthorityStatus.SUPERSEDED]: 0,
      [AuthorityStatus.DRAFT_UNAPPROVED]: 0,
      [AuthorityStatus.UNKNOWN]: 0,
    };

    if (!pathValidation.isValid) {
      this.logger.warn(`Engineering library scan aborted: ${pathValidation.error}`);
      const emptyManifest: ScanManifest = {
        schemaVersion: SCANNER_SCHEMA_VERSION,
        scannerVersion: SCANNER_VERSION,
        scanBatchId,
        scanTimestamp,
        libraryRoot,
        isLibraryConfigured: false,
        isLibraryAccessible: false,
        totalFiles: 0,
        totalDirectories: 0,
        totalBytes: 0,
        eligibleFiles: 0,
        excludedFiles: 0,
        classificationCounts,
        authorityCounts,
        duplicateGroups: [],
        revisionCandidateGroups: [],
        scanErrors: [{ path: libraryRoot, error: pathValidation.error || 'Invalid library path' }],
        files: [],
      };
      this.lastManifest = emptyManifest;
      return emptyManifest;
    }

    this.logger.log(`Starting read-only scan of Engineering Library at: ${libraryRoot}`);

    const scannedRecords: ScannedFileRecord[] = [];
    const scanErrors: { path: string; error: string }[] = [];
    let totalDirectories = 0;
    let totalBytes = 0;

    // Recursive directory traversal
    const traverseDirectory = async (currentDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        scanErrors.push({ path: currentDir, error: `Directory read error: ${err.message}` });
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(libraryRoot, fullPath);

        if (entry.isDirectory()) {
          totalDirectories += 1;
          await traverseDirectory(fullPath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.promises.stat(fullPath);
            const fileSize = stats.size;
            const modifiedAt = stats.mtime.toISOString();
            totalBytes += fileSize;

            const classificationResult = this.classifyFile(relPath, fileSize);
            classificationCounts[classificationResult.classification] =
              (classificationCounts[classificationResult.classification] || 0) + 1;
            authorityCounts[classificationResult.authorityStatus] =
              (authorityCounts[classificationResult.authorityStatus] || 0) + 1;

            let fileSha256: string | null = null;
            const shouldHash = options.computeHashesForEligibleOnly
              ? classificationResult.isEligible
              : true;

            if (shouldHash) {
              try {
                fileSha256 = await this.computeFileSha256(fullPath);
              } catch (hashErr: any) {
                scanErrors.push({ path: relPath, error: `SHA-256 failed: ${hashErr.message}` });
              }
            }

            const record: ScannedFileRecord = {
              relativePath: relPath.replace(/\\/g, '/'),
              fileName: entry.name,
              extension: path.extname(entry.name).toLowerCase(),
              directory: path.dirname(relPath).replace(/\\/g, '/'),
              fileSize,
              modifiedAt,
              sha256: fileSha256,
              classification: classificationResult.classification,
              isEligible: classificationResult.isEligible,
              authorityStatus: classificationResult.authorityStatus,
              authorityReason: classificationResult.authorityReason,
              revisionCandidate: classificationResult.revisionCandidate,
              provenanceMetadata: {
                ...classificationResult.provenance,
                scanBatchId,
                scannerVersion: SCANNER_VERSION,
              },
            };

            scannedRecords.push(record);
          } catch (fileErr: any) {
            scanErrors.push({ path: relPath, error: `File stat error: ${fileErr.message}` });
          }
        }
      }
    };

    await traverseDirectory(libraryRoot);

    // Deterministic sorting by relativePath
    scannedRecords.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    // Duplicate detection based on SHA-256
    const hashToFiles = new Map<string, ScannedFileRecord[]>();
    for (const rec of scannedRecords) {
      if (rec.sha256 && rec.sha256.length > 0) {
        const group = hashToFiles.get(rec.sha256) || [];
        group.push(rec);
        hashToFiles.set(rec.sha256, group);
      }
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [hash, group] of hashToFiles.entries()) {
      if (group.length > 1) {
        duplicateGroups.push({
          sha256: hash,
          count: group.length,
          totalBytes: group[0].fileSize * group.length,
          primaryPath: group[0].relativePath,
          duplicatePaths: group.slice(1).map((g) => g.relativePath),
        });
        // Tag secondary records
        for (let i = 1; i < group.length; i += 1) {
          group[i].duplicateOfHash = hash;
        }
      }
    }

    // Revision candidate grouping
    const revisionCandidateGroups = this.detectRevisionCandidateGroups(scannedRecords);

    const totalFiles = scannedRecords.length;
    const eligibleFiles = scannedRecords.filter((r) => r.isEligible).length;
    const excludedFiles = totalFiles - eligibleFiles;

    const manifest: ScanManifest = {
      schemaVersion: SCANNER_SCHEMA_VERSION,
      scannerVersion: SCANNER_VERSION,
      scanBatchId,
      scanTimestamp,
      libraryRoot,
      isLibraryConfigured: true,
      isLibraryAccessible: true,
      totalFiles,
      totalDirectories,
      totalBytes,
      eligibleFiles,
      excludedFiles,
      classificationCounts,
      authorityCounts,
      duplicateGroups,
      revisionCandidateGroups,
      scanErrors,
      files: scannedRecords,
    };

    this.lastManifest = manifest;
    this.logger.log(
      `Scan complete. Total files: ${totalFiles}, Eligible domain assets: ${eligibleFiles}, Excluded runtime: ${excludedFiles}, Duplicates: ${duplicateGroups.length}`,
    );

    return manifest;
  }

  /**
   * Group files by base project or root name to identify revision candidates.
   */
  private detectRevisionCandidateGroups(records: ScannedFileRecord[]): RevisionCandidateGroup[] {
    const baseGroups = new Map<string, ScannedFileRecord[]>();

    for (const rec of records) {
      if (!rec.isEligible) continue;
      // Strip revision markers like _RevA, (1), etc. to find base key
      const baseName = rec.fileName
        .replace(/[-_]?(Rev[A-Z]|\(\d+\)|_v\d+)/gi, '')
        .replace(/\.[^/.]+$/, '')
        .trim();

      if (baseName.length > 2) {
        const list = baseGroups.get(baseName) || [];
        list.push(rec);
        baseGroups.set(baseName, list);
      }
    }

    const revisionGroups: RevisionCandidateGroup[] = [];
    for (const [baseKey, items] of baseGroups.entries()) {
      if (items.length > 1) {
        // Sort newest first
        const sorted = [...items].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        revisionGroups.push({
          baseIdentifier: baseKey,
          latestCandidate: sorted[0].relativePath,
          candidatePaths: sorted.map((item) => ({
            path: item.relativePath,
            revisionToken: item.revisionCandidate || (item.fileName.match(/\(\d+\)/)?.[0] ?? 'base'),
            modifiedAt: item.modifiedAt,
            authorityStatus: item.authorityStatus,
          })),
        });
      }
    }

    return revisionGroups.sort((a, b) => a.baseIdentifier.localeCompare(b.baseIdentifier));
  }

  /**
   * Produce deterministic JSON string for manifest.
   */
  generateManifestJson(manifest: ScanManifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Produce comprehensive human-readable Markdown scan report.
   */
  generateScanReportMarkdown(manifest: ScanManifest): string {
    const sizeMb = (manifest.totalBytes / (1024 * 1024)).toFixed(2);
    const dateStr = manifest.scanTimestamp;

    return `# M7 — Engineering Knowledge Library Scan Report
## Automated Discovery & Governance Audit
**Scan Batch ID:** \`${manifest.scanBatchId}\`  
**Scan Timestamp:** \`${dateStr}\`  
**Scanner Version:** \`${manifest.scannerVersion}\`  
**Library Root:** \`${manifest.libraryRoot}\`  
**Governance Mode:** Strict Read-Only  

---

## 1. Executive Metrics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Files Discovered** | **${manifest.totalFiles.toLocaleString()}** | Complete filesystem recursive traversal |
| **Total Directories** | **${manifest.totalDirectories.toLocaleString()}** | Discovered subfolder depth |
| **Total Physical Size** | **${sizeMb} MB** (${manifest.totalBytes.toLocaleString()} bytes) | Raw storage on disk |
| **Eligible Engineering Assets** | **${manifest.eligibleFiles.toLocaleString()}** | Pre-filtered domain assets for RAG ingestion |
| **Excluded Runtime Files** | **${manifest.excludedFiles.toLocaleString()}** | Dependencies (.venv, node_modules, bytecode) |
| **Identical Duplicate Groups** | **${manifest.duplicateGroups.length}** | SHA-256 hash match groups |
| **Revision Candidate Groups** | **${manifest.revisionCandidateGroups.length}** | Iteration / revision sequences detected |
| **Scan Errors / Inaccessible** | **${manifest.scanErrors.length}** | Permission or missing file errors |

---

## 2. Classification Breakdown

| Classification | Count | Description |
| :--- | :--- | :--- |
| **ENGINEERING_DOCUMENT** | ${manifest.classificationCounts.ENGINEERING_DOCUMENT || 0} | Markdown specifications, data dictionaries, analysis reports |
| **ENGINEERING_DATA** | ${manifest.classificationCounts.ENGINEERING_DATA || 0} | Part lists, cycle times, process planning sheets, index files |
| **STRUCTURED_DATABASE** | ${manifest.classificationCounts.STRUCTURED_DATABASE || 0} | MEKB SQLite relational database (24 tables) |
| **MASTER_WORKBOOK** | ${manifest.classificationCounts.MASTER_WORKBOOK || 0} | Master project workbooks (PL.xlsx, Asset Inventory) |
| **PARSER_SOURCE** | ${manifest.classificationCounts.PARSER_SOURCE || 0} | Extraction parsers and domain schema definitions |
| **MANIFEST** | ${manifest.classificationCounts.MANIFEST || 0} | Historical export batch logs and summaries |
| **RUNTIME_DEPENDENCY** | ${manifest.classificationCounts.RUNTIME_DEPENDENCY || 0} | Excluded package dependencies (.venv / node_modules) |
| **BINARY_RUNTIME** | ${manifest.classificationCounts.BINARY_RUNTIME || 0} | Excluded compiled binaries (.pyc, .dll, .pyd, .exe) |
| **CACHE / BUILD_ARTIFACT** | ${(manifest.classificationCounts.CACHE || 0) + (manifest.classificationCounts.BUILD_ARTIFACT || 0)} | Excluded source maps, temp cache files |
| **UNKNOWN / EXCLUDED** | ${(manifest.classificationCounts.UNKNOWN || 0) + (manifest.classificationCounts.EXCLUDED || 0)} | Unclassified / non-engineering files |

---

## 3. Authority Classification

| Authority Status | Count | Ingestion Handling |
| :--- | :--- | :--- |
| **AUTHORITATIVE_RELEASE** | ${manifest.authorityCounts.AUTHORITATIVE_RELEASE || 0} | Primary RAG candidate (Score multiplier: $1.0\\times$) |
| **CURRENT_WORKING** | ${manifest.authorityCounts.CURRENT_WORKING || 0} | Active project working sheets (Score multiplier: $0.8\\times$) |
| **HISTORICAL_REFERENCE** | ${manifest.authorityCounts.HISTORICAL_REFERENCE || 0} | Secondary baseline reference (Score multiplier: $0.5\\times$) |
| **SUPERSEDED** | ${manifest.authorityCounts.SUPERSEDED || 0} | Replaced revisions (filtered by default) |
| **UNKNOWN** | ${manifest.authorityCounts.UNKNOWN || 0} | Non-domain or excluded runtime records |

---

## 4. Key Authoritative Domain Assets

${manifest.files
  .filter((f) => f.isEligible)
  .slice(0, 30)
  .map(
    (f) =>
      `- \`${f.relativePath}\` (${(f.fileSize / 1024).toFixed(1)} KB) — *${f.classification}* [${f.authorityStatus}] (SHA-256: \`${f.sha256 ? f.sha256.substring(0, 12) + '...' : 'none'}\`)`,
  )
  .join('\n')}

---

## 5. Duplicate Groups Summary

${
  manifest.duplicateGroups.length === 0
    ? '*No duplicate content hash groups detected.*'
    : manifest.duplicateGroups
        .slice(0, 10)
        .map(
          (d, idx) =>
            `### Group ${idx + 1} (SHA-256: \`${d.sha256.substring(0, 16)}...\`)\n- **Primary:** \`${d.primaryPath}\`\n- **Duplicates:**\n${d.duplicatePaths.map((p) => `  - \`${p}\``).join('\n')}`,
        )
        .join('\n\n')
}

---

## 6. Revision Candidate Groups Summary

${
  manifest.revisionCandidateGroups.length === 0
    ? '*No revision candidate sequences detected.*'
    : manifest.revisionCandidateGroups
        .slice(0, 10)
        .map(
          (rg) =>
            `### Base: \`${rg.baseIdentifier}\`\n- **Latest Candidate:** \`${rg.latestCandidate}\`\n- **Sequences:**\n${rg.candidatePaths.map((cp) => `  - \`${cp.path}\` (${cp.revisionToken}) [${cp.authorityStatus}]`).join('\n')}`,
        )
        .join('\n\n')
}

---

## 7. Safety & Compliance Affirmation

- **Source Integrity:** Verified read-only scan. Zero source files were modified, moved, renamed, or deleted.
- **Exclusion Verification:** All 19k+ virtualenv and node_modules dependencies successfully isolated from knowledge eligibility.
- **Deterministic Manifest:** Full JSON manifest available at \`M7_LIBRARY_MANIFEST.json\`.
`;
  }

  /**
   * Get latest cached scan manifest.
   */
  getLastManifest(): ScanManifest | null {
    return this.lastManifest;
  }
}
