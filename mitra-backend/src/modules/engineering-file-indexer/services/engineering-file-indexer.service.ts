import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { EngineeringFileIndex } from '../entities/engineering-file-index.entity';
import { ToolMaster } from '../../tool-master/entities/tool-master.entity';

type ScanOptions = {
  toolNo?: string;
  batchSize?: number;
  progressEvery?: number;
};

type ScanSummary = {
  scannedRoots: number;
  scannedDirectories: number;
  scannedFiles: number;
  indexed: number;
  indexedFolders: number;
  indexedFiles: number;
  skippedFolders: number;
  skippedUnchangedFolders: number;
  changedRecords: number;
};

type IndexPayload = Partial<EngineeringFileIndex> & {
  uncPath: string;
  toolNo: string;
  itemType: 'folder' | 'file';
  relativePath: string;
  lastModifiedAt: Date;
};

type ScanContext = {
  tenantId: string | null | undefined;
  toolNumbers: string[];
  targetToolNo: string | null;
  existingByPath: Map<string, EngineeringFileIndex>;
  indexed: Set<string>;
  pending: EngineeringFileIndex[];
  summary: ScanSummary;
  batchSize: number;
  progressEvery: number;
};

@Injectable()
export class EngineeringFileIndexerService {
  private readonly logger = new Logger(EngineeringFileIndexerService.name);
  private readonly skippedFolderPattern = /(^|[\s_.-])(obsolete|backup|temp|archive)($|[\s_.-])/i;
  private readonly sharePath = process.env.ENGINEERING_SHARE_PATH ?? '\\\\192.168.1.80\\Prathiraj Design Data';
  private readonly roots = (process.env.ENGINEERING_SHARE_ROOTS?.split('|').map((root) => root.trim()).filter(Boolean)) ?? [
    'Blow Molds - Design Data',
    'Injection Molds - Design Data',
    'Job Works',
    'Mold Base - Design Data',
    'IBM - Design Data',
  ];

  constructor(
    @InjectRepository(EngineeringFileIndex) private readonly indexRepo: Repository<EngineeringFileIndex>,
    @InjectRepository(ToolMaster) private readonly toolRepo: Repository<ToolMaster>,
  ) {}

  async scanAndIndex(tenantId?: string | null, options: ScanOptions = {}) {
    const matches = await this.toolRepo.find({ where: { deletedAt: IsNull(), tenantId: tenantId ?? undefined } as any });
    const toolNumbers = matches.map((tool) => tool.toolNo?.trim()).filter(Boolean);
    const targetToolNo = options.toolNo ? this.normalizeToolNo(options.toolNo) : null;
    if (targetToolNo && !toolNumbers.some((toolNo) => this.normalizeToolNo(toolNo) === targetToolNo)) {
      toolNumbers.push(targetToolNo);
    }
    const existingRows = await this.loadExistingIndexRows(tenantId, targetToolNo);
    const context: ScanContext = {
      tenantId,
      toolNumbers,
      targetToolNo,
      existingByPath: new Map(existingRows.map((row) => [row.uncPath, row])),
      indexed: new Set<string>(),
      pending: [],
      summary: {
        scannedRoots: this.roots.length,
        scannedDirectories: 0,
        scannedFiles: 0,
        indexed: 0,
        indexedFolders: 0,
        indexedFiles: 0,
        skippedFolders: 0,
        skippedUnchangedFolders: 0,
        changedRecords: 0,
      },
      batchSize: Math.max(100, Math.min(options.batchSize ?? 250, 500)),
      progressEvery: options.progressEvery ?? 1000,
    };

    for (const root of this.roots) {
      const rootPath = path.join(this.sharePath, root);
      if (!fs.existsSync(rootPath)) {
        this.logger.warn(`[scan] missing root ${rootPath}`);
        continue;
      }
      await this.walk(rootPath, root, context, true);
    }

    await this.flushPending(context);
    const existing = existingRows.filter((item) => !item.deletedAt);
    for (const item of existing) {
      if (targetToolNo && this.normalizeToolNo(item.toolNo) !== targetToolNo) {
        continue;
      }
      if (!context.indexed.has(item.uncPath)) {
        item.deletedAt = new Date();
        context.pending.push(item);
        await this.flushPendingIfNeeded(context);
      }
    }
    await this.flushPending(context);

    context.summary.indexed = context.indexed.size;
    return context.summary;
  }

  async browse(tenantId?: string | null, toolNo?: string, itemType?: 'folder' | 'file') {
    const qb = this.indexRepo.createQueryBuilder('index');
    qb.where('index.deletedAt IS NULL');
    if (tenantId) qb.andWhere('index.tenantId = :tenantId', { tenantId });
    if (toolNo) qb.andWhere('index.toolNo = :toolNo', { toolNo });
    if (itemType) qb.andWhere('index.itemType = :itemType', { itemType });
    return qb.orderBy('index.toolNo', 'ASC').addOrderBy('index.relativePath', 'ASC').getMany();
  }

  private async walk(currentPath: string, rootName: string, context: ScanContext, isRoot = false) {
    const folderName = path.basename(currentPath);
    if (!isRoot && this.shouldSkipFolder(folderName)) {
      context.summary.skippedFolders += 1;
      return;
    }

    let folderStat: fs.Stats;
    try {
      folderStat = fs.statSync(currentPath);
    } catch (error) {
      this.logger.warn(`[scan] unable to stat ${currentPath}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const currentToolNo = this.matchToolNo(currentPath, context.toolNumbers);
    if (context.targetToolNo && currentToolNo && this.normalizeToolNo(currentToolNo) !== context.targetToolNo) {
      context.summary.skippedFolders += 1;
      return;
    }

    if (currentToolNo && this.isTargetTool(currentToolNo, context)) {
      const folderPath = this.normalizePath(currentPath);
      const existingFolder = context.existingByPath.get(folderPath);
      this.queueIndexRecord(context, {
        fullPath: currentPath,
        itemType: 'folder',
        toolNo: currentToolNo,
        sizeBytes: 0,
        lastModifiedAt: folderStat.mtime,
      });
      await this.flushPendingIfNeeded(context);
      context.summary.indexedFolders += 1;
      if (existingFolder && this.sameStamp(existingFolder, 0, folderStat.mtime)) {
        this.markExistingSubtree(context, this.normalizeRelativePath(currentPath));
        context.summary.skippedUnchangedFolders += 1;
        return;
      }
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
      this.logger.warn(`[scan] unable to read ${currentPath}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const files = entries.filter((entry) => entry.isFile()).length;
    context.summary.scannedDirectories += 1;
    context.summary.scannedFiles += files;

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await this.walk(fullPath, rootName, context);
        continue;
      }

      const toolNo = this.matchToolNo(fullPath, context.toolNumbers);
      if (!toolNo || !this.isTargetTool(toolNo, context)) continue;
      const stat = fs.statSync(fullPath);
      this.queueIndexRecord(context, {
        fullPath,
        itemType: 'file',
        toolNo,
        sizeBytes: stat.size,
        lastModifiedAt: stat.mtime,
      });
      context.summary.indexedFiles += 1;
      if (context.summary.indexedFiles % context.progressEvery === 0) {
        this.logger.log(`[scan] ${context.summary.indexedFiles} files indexed; current root=${rootName}`);
      }
      await this.flushPendingIfNeeded(context);
    }
  }

  private queueIndexRecord(context: ScanContext, input: {
    fullPath: string;
    itemType: 'folder' | 'file';
    toolNo: string;
    sizeBytes: number;
    lastModifiedAt: Date;
  }) {
    const relativePath = this.normalizeRelativePath(input.fullPath);
    const parentRelativePath = this.normalizeRelativePath(path.dirname(input.fullPath));
    const uncPath = this.normalizePath(input.fullPath);
    const folderPath = input.itemType === 'folder' ? input.fullPath : path.dirname(input.fullPath);
    const fileName = input.itemType === 'folder' ? path.basename(input.fullPath) : path.basename(input.fullPath);
    const existing = context.existingByPath.get(uncPath);
    const payload: IndexPayload = {
      toolNo: input.toolNo,
      itemType: input.itemType,
      folderName: path.basename(folderPath),
      folderPath: this.normalizePath(folderPath),
      relativePath,
      parentRelativePath,
      uncPath,
      fileName,
      extension: input.itemType === 'file' ? path.extname(input.fullPath).toLowerCase() : null,
      sizeBytes: input.sizeBytes,
      lastModifiedAt: input.lastModifiedAt,
      tenantId: context.tenantId ?? null,
      deletedAt: null,
    };

    context.indexed.add(uncPath);
    if (existing) {
      if (this.sameRecord(existing, payload)) return;
      Object.assign(existing, payload);
      context.pending.push(existing);
    } else {
      const created = this.indexRepo.create(payload);
      context.existingByPath.set(uncPath, created);
      context.pending.push(created);
    }
    context.summary.changedRecords += 1;
  }

  private matchToolNo(fullPath: string, toolNumbers: string[]) {
    const segments = this.normalizePath(fullPath).split('/').map((segment) => segment.toUpperCase());
    const normalizedToolNumbers = toolNumbers.map((toolNo) => this.normalizeToolNo(toolNo));
    const fallbackMatches: string[] = [];

    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = segments[index];
      if (/\b(BM|IM)\s*[-_ ]?\s*\d{2,4}\s*[-_ ]+\s*(BM|IM)?\s*[-_ ]?\s*\d{2,4}\b/i.test(segment)) {
        continue;
      }
      const matches = segment.match(/\b(BM|IM)\s*[-_ ]?\s*(\d{2,4})\b/gi);
      if (!matches) continue;

      for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
        const normalized = this.normalizeToolNo(matches[matchIndex]);
        const toolIndex = normalizedToolNumbers.indexOf(normalized);
        if (toolIndex >= 0) {
          return toolNumbers[toolIndex];
        }
        fallbackMatches.push(normalized);
      }
    }

    return fallbackMatches[0] ?? null;
  }

  private normalizeToolNo(value: string) {
    return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private normalizePath(value: string) {
    return value.replace(/\\/g, '/');
  }

  private normalizeRelativePath(value: string) {
    const relativePath = path.relative(this.sharePath, value);
    return relativePath && relativePath !== '.' ? this.normalizePath(relativePath) : '';
  }

  private async loadExistingIndexRows(tenantId: string | null | undefined, _targetToolNo: string | null) {
    const qb = this.indexRepo.createQueryBuilder('index').withDeleted();
    if (tenantId) qb.where('index.tenantId = :tenantId', { tenantId });
    else qb.where('index.tenantId IS NULL');
    return qb.getMany();
  }

  private async flushPendingIfNeeded(context: ScanContext) {
    if (context.pending.length >= context.batchSize) {
      await this.flushPending(context);
    }
  }

  private async flushPending(context: ScanContext) {
    if (!context.pending.length) return;
    const batch = context.pending.splice(0, context.pending.length);
    await this.indexRepo.save(batch);
  }

  private shouldSkipFolder(folderName: string) {
    if (!folderName) return false;
    if (folderName.startsWith('.')) return true;
    const normalized = folderName.toLowerCase();
    if (normalized === 'node_modules' || normalized === '.git') return true;
    return this.skippedFolderPattern.test(normalized);
  }

  private isTargetTool(toolNo: string, context: ScanContext) {
    return !context.targetToolNo || this.normalizeToolNo(toolNo) === context.targetToolNo;
  }

  private sameStamp(existing: EngineeringFileIndex, sizeBytes: number, lastModifiedAt: Date) {
    return Number(existing.sizeBytes) === sizeBytes && existing.lastModifiedAt?.getTime() === lastModifiedAt.getTime();
  }

  private sameRecord(existing: EngineeringFileIndex, payload: IndexPayload) {
    return (
      existing.toolNo === payload.toolNo &&
      existing.itemType === payload.itemType &&
      existing.relativePath === payload.relativePath &&
      existing.parentRelativePath === payload.parentRelativePath &&
      existing.fileName === payload.fileName &&
      existing.extension === payload.extension &&
      Number(existing.sizeBytes) === Number(payload.sizeBytes) &&
      existing.lastModifiedAt?.getTime() === payload.lastModifiedAt.getTime() &&
      existing.deletedAt === null
    );
  }

  private markExistingSubtree(context: ScanContext, relativePath: string) {
    const prefix = relativePath ? `${relativePath}/` : '';
    for (const row of context.existingByPath.values()) {
      if (row.deletedAt) continue;
      if (row.relativePath === relativePath || (prefix && row.relativePath.startsWith(prefix))) {
        context.indexed.add(row.uncPath);
      }
    }
  }
}
