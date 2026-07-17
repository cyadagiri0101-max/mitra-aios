# Engineering File Indexer Handoff

## 1. Architecture
- Backend module: mitra-backend/src/modules/engineering-file-indexer
- Main service: EngineeringFileIndexerService
- Entity: EngineeringFileIndex
- Controller routes: engineering-file-indexer and engineering-file-index
- Frontend page: mitra-frontend/src/pages/EngineeringFileIndexerPage.tsx
- Storage model: metadata-only indexing of folders and files from the SMB engineering share into PostgreSQL

## 2. Scan workflow
1. Resolve the configured SMB share root(s).
2. Traverse the engineering directory tree recursively.
3. Skip obsolete/archive/temp/backup/hidden/system folders.
4. Detect BM/IM tool numbers from folder names and path segments.
5. Index each folder and file as a metadata row.
6. Preserve folder hierarchy with relative paths and parent path metadata.
7. Support incremental rescans by updating existing records and avoiding duplicate rows.

## 3. Indexed database schema
Core fields stored in engineering_file_index:
- id
- createdAt / updatedAt / deletedAt
- tenantId
- toolNo
- itemType (folder | file)
- folderName
- folderPath
- parentRelativePath
- relativePath
- uncPath
- fileName
- extension
- sizeBytes
- lastModifiedAt

## 4. Scan command
From mitra-backend:
- node .\run_engineering_scan_simple.js

## 5. Single-tool scan command
From mitra-backend:
- node .\run_engineering_scan_simple.js BM450
- node .\run_engineering_scan_simple.js BM458
- node .\run_engineering_scan_simple.js BM475
- node .\run_engineering_scan_simple.js BM480

## 6. Full scan command
From mitra-backend:
- node .\run_engineering_scan_simple.js

## 7. API endpoints
Authenticated endpoints:
- POST /engineering-file-indexer/scan
- GET /engineering-file-indexer/browse
- GET /engineering-file-index

Query parameters:
- toolNo
- itemType (folder | file)

## 8. Known limitations
- The indexer reads metadata only; it does not open or edit engineering files.
- Tool detection depends on folder/path naming conventions and may require tuning for non-standard paths.
- Large-share scans can be time-consuming and should be run in a controlled batch/window.
- The current implementation is optimized for targeted tool scans and incremental updates rather than full-share reindexing on every run.

## 9. Performance recommendations
- Use single-tool scans during validation and troubleshooting.
- Keep the share roots and skip patterns configured conservatively.
- Prefer incremental rescans over full rescans when the share is large.
- Batch database writes to reduce transaction overhead.
- Monitor scan output and avoid excessive per-file logging in production runs.

## 10. Actual changed files in this implementation
- mitra-backend/src/modules/engineering-file-indexer/services/engineering-file-indexer.service.ts
- mitra-backend/src/modules/engineering-file-indexer/entities/engineering-file-index.entity.ts
- mitra-backend/src/modules/engineering-file-indexer/controllers/engineering-file-indexer.controller.ts
- mitra-backend/src/modules/engineering-file-indexer/engineering-file-indexer.module.ts
- mitra-backend/src/modules/engineering-file-indexer/services/engineering-file-indexer.service.spec.ts
- mitra-backend/src/modules/engineering-file-indexer/controllers/engineering-file-indexer.controller.spec.ts
- mitra-backend/src/pages/EngineeringFileIndexerPage.tsx
- mitra-backend/create_engineering_index_table.js
- mitra-backend/run_engineering_scan_simple.js
- mitra-backend/verify_engineering_samples.js
