import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolderScanJob } from '../entities/folderscanjob.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

@Injectable()
export class FolderScanJobService extends TenantAwareService<FolderScanJob> {
  constructor(
    @InjectRepository(FolderScanJob)
    repo: Repository<FolderScanJob>,
  ) {
    super(repo, 'FolderScanJob');
  }

  // ── File classification utilities ─────────────────────────────────────────
  // Regex-based classification — used by the folder intelligence pipeline.
  private static readonly EXT_MAP: Record<string, string> = {
    sldprt: '3D_MODEL', sldasm: '3D_MODEL', step: '3D_MODEL', stp: '3D_MODEL',
    iges: '3D_MODEL', igs: '3D_MODEL', prt: '3D_MODEL', catpart: '3D_MODEL',
    dwg: 'DRAWING', dxf: 'DRAWING', pdf: 'DRAWING',
    nc: 'CAM_PROGRAM', tap: 'CAM_PROGRAM', cnc: 'CAM_PROGRAM', mpf: 'CAM_PROGRAM',
    iso: 'EDM_PROGRAM', edm: 'EDM_PROGRAM',
    xlsx: 'INSPECTION_REPORT', xls: 'INSPECTION_REPORT',
  };

  private static readonly REV_PATTERN = /^(.+?)(?:[_\-][RrVv](\d+))?\.(\w+)$/;

  classifyFile(filename: string): {
    category: string;
    partNumber: string | null;
    revision: string | null;
    extension: string;
  } {
    const m = FolderScanJobService.REV_PATTERN.exec(filename);
    if (!m) {
      return { category: 'UNKNOWN', partNumber: null, revision: null, extension: '' };
    }
    const [, baseName, rev, ext] = m;
    const category = FolderScanJobService.EXT_MAP[ext.toLowerCase()] ?? 'UNKNOWN';
    return {
      category,
      partNumber: baseName.toUpperCase(),
      revision: rev ?? null,
      extension: ext.toLowerCase(),
    };
  }

  classifyBatch(filenames: string[]): {
    files: ReturnType<FolderScanJobService['classifyFile']>[];
    coverage: Record<string, { categories: string[]; readiness: number }>;
    summary: { total: number; readyParts: number; missingDrawing: string[] };
  } {
    const files = filenames.map(f => this.classifyFile(f));
    const coverage: Record<string, { categories: string[]; readiness: number }> = {};

    for (const f of files) {
      if (!f.partNumber) continue;
      if (!coverage[f.partNumber]) coverage[f.partNumber] = { categories: [], readiness: 0 };
      if (!coverage[f.partNumber].categories.includes(f.category)) {
        coverage[f.partNumber].categories.push(f.category);
      }
    }

    const scores: Record<string, number> = {
      '3D_MODEL': 40, 'DRAWING': 40, 'CAM_PROGRAM': 10, 'EDM_PROGRAM': 10,
    };
    for (const part of Object.keys(coverage)) {
      coverage[part].readiness = coverage[part].categories.reduce(
        (s, c) => s + (scores[c] ?? 0), 0,
      );
    }

    const missingDrawing = Object.entries(coverage)
      .filter(([, v]) => v.categories.includes('3D_MODEL') && !v.categories.includes('DRAWING'))
      .map(([k]) => k);

    const readyParts = Object.values(coverage).filter(v => v.readiness >= 80).length;

    return { files, coverage, summary: { total: files.length, readyParts, missingDrawing } };
  }
}
