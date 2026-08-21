export enum EngineeringAssetClassification {
  AUTHORITATIVE_ENGINEERING = 'AUTHORITATIVE_ENGINEERING',
  ENGINEERING_DOCUMENT = 'ENGINEERING_DOCUMENT',
  ENGINEERING_DATA = 'ENGINEERING_DATA',
  PARSER_SOURCE = 'PARSER_SOURCE',
  STRUCTURED_DATABASE = 'STRUCTURED_DATABASE',
  MASTER_WORKBOOK = 'MASTER_WORKBOOK',
  MANIFEST = 'MANIFEST',
  RUNTIME_DEPENDENCY = 'RUNTIME_DEPENDENCY',
  BUILD_ARTIFACT = 'BUILD_ARTIFACT',
  CACHE = 'CACHE',
  BINARY_RUNTIME = 'BINARY_RUNTIME',
  UNKNOWN = 'UNKNOWN',
  EXCLUDED = 'EXCLUDED',
}

export enum AuthorityStatus {
  AUTHORITATIVE_RELEASE = 'AUTHORITATIVE_RELEASE',
  CURRENT_WORKING = 'CURRENT_WORKING',
  HISTORICAL_REFERENCE = 'HISTORICAL_REFERENCE',
  SUPERSEDED = 'SUPERSEDED',
  DRAFT_UNAPPROVED = 'DRAFT_UNAPPROVED',
  UNKNOWN = 'UNKNOWN',
}

export interface ProvenanceMetadata {
  projectNumber?: string | null;
  projectPrefix?: string | null;
  customer?: string | null;
  productName?: string | null;
  documentType?: string | null;
  revision?: string | null;
  machine?: string | null;
  material?: string | null;
  componentType?: string | null;
  batchId?: string | null;
  scanBatchId?: string | null;
  scannerVersion?: string | null;
}

export interface ScannedFileRecord {
  relativePath: string;
  absolutePath?: string;
  fileName: string;
  extension: string;
  directory: string;
  fileSize: number;
  modifiedAt: string;
  sha256?: string | null;
  classification: EngineeringAssetClassification;
  isEligible: boolean;
  authorityStatus: AuthorityStatus;
  authorityReason?: string | null;
  revisionCandidate?: string | null;
  duplicateOfHash?: string | null;
  provenanceMetadata?: ProvenanceMetadata;
  error?: string | null;
}

export interface DuplicateGroup {
  sha256: string;
  count: number;
  totalBytes: number;
  primaryPath: string;
  duplicatePaths: string[];
}

export interface RevisionCandidateGroup {
  baseIdentifier: string;
  latestCandidate: string;
  candidatePaths: {
    path: string;
    revisionToken: string;
    modifiedAt: string;
    authorityStatus: AuthorityStatus;
  }[];
}

export interface ScanManifest {
  schemaVersion: string;
  scannerVersion: string;
  scanBatchId: string;
  scanTimestamp: string;
  libraryRoot: string;
  isLibraryConfigured: boolean;
  isLibraryAccessible: boolean;
  totalFiles: number;
  totalDirectories: number;
  totalBytes: number;
  eligibleFiles: number;
  excludedFiles: number;
  classificationCounts: Record<EngineeringAssetClassification, number>;
  authorityCounts: Record<AuthorityStatus, number>;
  duplicateGroups: DuplicateGroup[];
  revisionCandidateGroups: RevisionCandidateGroup[];
  scanErrors: { path: string; error: string }[];
  files: ScannedFileRecord[];
}

export interface ScannerOptions {
  libraryPath?: string;
  computeHashesForEligibleOnly?: boolean;
  maxFilesLimit?: number;
  batchId?: string;
}
