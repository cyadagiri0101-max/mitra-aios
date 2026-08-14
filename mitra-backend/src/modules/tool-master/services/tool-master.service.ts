import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as path from 'path';
import { spawn } from 'child_process';
import { EngineeringFileIndexerService } from '../../engineering-file-indexer/services/engineering-file-indexer.service';
import { ToolMasterMetadataService } from './tool-master-metadata.service';
import { ToolMaster } from '../entities/tool-master.entity';

@Injectable()
export class ToolMasterService {
  constructor(
    @InjectRepository(ToolMaster)
    private readonly repo: Repository<ToolMaster>,
    private readonly metadataService: ToolMasterMetadataService,
    private readonly engineeringIndexerService?: EngineeringFileIndexerService,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  async findAll(
    tenantId?: string | null,
    page = 1,
    limit = 20,
    search?: string,
    toolType?: string,
    status?: string,
    toolNo?: string,
    projectName?: string,
    customerName?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const scopeTenant = this.requireTenant(tenantId);
    const qb = this.repo.createQueryBuilder('tool');
    qb.where('tool.deletedAt IS NULL');
    qb.andWhere('tool.tenantId = :tenantId', { tenantId: scopeTenant });
    if (toolType) qb.andWhere('tool.toolType = :toolType', { toolType });
    if (status) qb.andWhere('tool.status ILIKE :status', { status: `%${status}%` });

    if (search) {
      const term = `%${search}%`;
      qb.andWhere(
        '(tool.toolNo ILIKE :term OR tool.projectName ILIKE :term OR tool.customerName ILIKE :term OR tool.productName ILIKE :term)',
        { term },
      );
    } else {
      if (toolNo) qb.andWhere('tool.toolNo ILIKE :toolNo', { toolNo: `%${toolNo}%` });
      if (projectName) qb.andWhere('tool.projectName ILIKE :projectName', { projectName: `%${projectName}%` });
      if (customerName) qb.andWhere('tool.customerName ILIKE :customerName', { customerName: `%${customerName}%` });
    }

    const safeSortBy = sortBy === 'projectName' ? 'projectName' : 'toolNo';
    const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const [data, total] = await qb
      .orderBy(`tool.${safeSortBy}`, safeSortOrder)
      .addOrderBy('tool.createdAt', 'DESC')
      .skip((Math.max(1, Number(page) || 1) - 1) * Math.max(1, Number(limit) || 20))
      .take(Math.max(1, Number(limit) || 20))
      .getManyAndCount();

    return { data, total, page: Math.max(1, Number(page) || 1), limit: Math.max(1, Number(limit) || 20), totalPages: Math.ceil(total / Math.max(1, Number(limit) || 20)) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const entity = await this.resolveToolRecord(id, tenantId);
    if (!entity) throw new NotFoundException('Tool master record not found');
    return entity;
  }

  async create(data: Record<string, any>, userId?: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const metadata = data.folderName ? this.metadataService.parseFolderName(data.folderName) : {} as any;
    const entity = this.repo.create({
      ...data,
      toolNo: data.toolNo ?? metadata.toolNo,
      toolType: data.toolType ?? metadata.toolType,
      projectName: data.projectName ?? metadata.projectNumber ?? data.projectName,
      productName: data.productName ?? metadata.productName,
      customerName: data.customerName ?? metadata.customerName,
      machine: data.machine ?? metadata.machine,
      cavity: data.cavity ?? metadata.cavity,
      capacity: data.capacity ?? metadata.capacity,
      material: data.material ?? metadata.material,
      neckType: data.neckType ?? metadata.neckType,
      tenantId: scopeTenant,
      createdBy: userId ?? undefined,
      updatedBy: userId ?? undefined,
    });
    return this.repo.save(entity);
  }

  async update(id: string, data: Record<string, any>, userId?: string, tenantId?: string | null) {
    this.requireTenant(tenantId);
    const entity = await this.findOne(id, tenantId);
    const metadata = data.folderName ? this.metadataService.parseFolderName(data.folderName) : {} as any;
    Object.assign(entity, {
      ...data,
      toolNo: entity.toolNo ?? data.toolNo ?? metadata.toolNo,
      toolType: entity.toolType ?? data.toolType ?? metadata.toolType,
      projectName: entity.projectName ?? data.projectName ?? metadata.projectNumber,
      productName: entity.productName ?? data.productName ?? metadata.productName,
      customerName: entity.customerName ?? data.customerName ?? metadata.customerName,
      machine: entity.machine ?? data.machine ?? metadata.machine,
      cavity: entity.cavity ?? data.cavity ?? metadata.cavity,
      capacity: (entity as any).capacity ?? data.capacity ?? metadata.capacity,
      material: (entity as any).material ?? data.material ?? metadata.material,
      neckType: (entity as any).neckType ?? data.neckType ?? metadata.neckType,
    }, { updatedBy: userId ?? entity.updatedBy });
    return this.repo.save(entity);
  }

  async remove(id: string, userId?: string, tenantId?: string | null) {
    this.requireTenant(tenantId);
    const entity = await this.findOne(id, tenantId);
    entity.deletedAt = new Date();
    entity.updatedBy = userId ?? entity.updatedBy;
    await this.repo.save(entity);
    return { deleted: true, id };
  }

  async getEngineeringContext(id: string, tenantId?: string | null, options: { page?: number; limit?: number } = {}) {
    const tool = await this.resolveToolRecord(id, tenantId);
    const fallbackToolNo = this.normalizeToolNo(id);
    const resolvedToolNo = tool?.toolNo ?? (fallbackToolNo || id);
    const normalizedResolvedToolNo = this.normalizeToolNo(resolvedToolNo);

    if (!this.engineeringIndexerService) {
      return { tool: tool ?? { id, toolNo: normalizedResolvedToolNo, toolType: 'BM' }, engineeringItems: [], partLists: [], drawings: [], documents: [], folders: [], files: [], timeline: [], totals: { all: 0, partLists: 0, drawings: 0, documents: 0, folders: 0, files: 0 }, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const engineeringItems = await this.engineeringIndexerService.browse(tenantId ?? undefined, normalizedResolvedToolNo);
    const partLists = await this.getPartListData(normalizedResolvedToolNo);
    const drawings = engineeringItems.filter((item: any) => item.itemType === 'file' && this.isDrawing(item));
    const documents = engineeringItems.filter((item: any) => item.itemType === 'file' && this.isDocument(item));
    const folders = engineeringItems.filter((item: any) => item.itemType === 'folder');
    const files = engineeringItems.filter((item: any) => item.itemType === 'file' && !this.isPartList(item) && !this.isDrawing(item) && !this.isDocument(item));

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const startIndex = (page - 1) * limit;
    const pagedEngineeringItems = engineeringItems.slice(startIndex, startIndex + limit);

    const timeline = [
      ...partLists.map((item: any) => ({
        type: 'part-list',
        title: `Part list revision ${item.revision}`,
        summary: `${item.revision} • ${item.filePath ?? 'Imported part list'}`,
        meta: item.totalCost != null ? `Total cost: ${item.totalCost}` : 'Cost summary available',
        timestamp: item.revision,
      })),
      ...engineeringItems
        .filter((item: any) => item.itemType === 'file')
        .map((item: any) => ({
          type: 'engineering-file',
          title: item.fileName || item.relativePath || 'Engineering file',
          summary: item.relativePath || '—',
          meta: item.extension || 'file',
          timestamp: item.lastModifiedAt || item.updatedAt || item.createdAt || '—',
        })),
    ].slice(0, 20);

    const resolvedTool = tool ?? {
      id,
      toolNo: normalizedResolvedToolNo,
      toolType: this.detectToolType(normalizedResolvedToolNo),
    };

    return {
      tool: resolvedTool,
      engineeringItems: pagedEngineeringItems,
      partLists,
      drawings,
      documents,
      folders,
      files,
      timeline,
      totals: {
        all: engineeringItems.length,
        partLists: partLists.length,
        drawings: drawings.length,
        documents: documents.length,
        folders: folders.length,
        files: files.length,
      },
      pagination: {
        page,
        limit,
        total: engineeringItems.length,
        totalPages: Math.ceil(engineeringItems.length / limit),
      },
    };
  }

  private async resolveToolRecord(id: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const byIdWhere: any = { id, deletedAt: IsNull(), tenantId: scopeTenant };
    const byId = await this.repo.findOne({ where: byIdWhere });
    if (byId) return byId;

    const byToolNoWhere: any = { toolNo: id, deletedAt: IsNull(), tenantId: scopeTenant };
    return this.repo.findOne({ where: byToolNoWhere });
  }

  private normalizeToolNo(value: string) {
    return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private detectToolType(toolNo: string) {
    const normalized = this.normalizeToolNo(toolNo);
    return normalized.startsWith('IM') ? 'IM' : 'BM';
  }

  private async getPartListData(toolNo: string) {
    const dbPath = path.resolve(process.cwd(), '..', 'pmm_data_library', 'pmm_database.db');
    const query = `SELECT Project_No, Revision, File_Path, Inserts_Cost, Mask_Parts_Cost, Mold_Base_Cost, Standard_Parts_Cost, Fasteners_Cost, Electrodes_Cost, Total_Cost FROM part_list_summaries WHERE Project_No = '${toolNo.replace(/'/g, "''")}' ORDER BY Revision`;

    return new Promise<any[]>((resolve) => {
      const python = spawn(process.env.PYTHON || 'python.exe', ['-c', `import sqlite3, json, sys; conn = sqlite3.connect(r'${dbPath}'); cur = conn.cursor(); cur.execute(${JSON.stringify(query)}); rows = cur.fetchall(); cols = [d[0] for d in cur.description]; print(json.dumps([dict(zip(cols, row)) for row in rows])); conn.close()`]);
      let output = '';
      python.stdout.on('data', (chunk) => { output += chunk.toString(); });
      python.stderr.on('data', (chunk) => { output += chunk.toString(); });
      python.on('close', () => {
        try {
          resolve(JSON.parse(output || '[]'));
        } catch {
          resolve([]);
        }
      });
    });
  }

  private isPartList(item: any) {
    const haystack = `${item.fileName ?? ''} ${item.relativePath ?? ''} ${item.folderName ?? ''}`.toLowerCase();
    return /part|bom|bill|list/i.test(haystack);
  }

  private isDrawing(item: any) {
    const haystack = `${item.fileName ?? ''} ${item.relativePath ?? ''} ${item.extension ?? ''}`.toLowerCase();
    return /drawing|dwg|drw|step|stp|iges|igs|sldprt|sldasm|pdf/i.test(haystack);
  }

  private isDocument(item: any) {
    const haystack = `${item.fileName ?? ''} ${item.relativePath ?? ''} ${item.extension ?? ''}`.toLowerCase();
    return /\.pdf$|\.doc$|\.docx$|\.xls$|\.xlsx$|\.ppt$|\.pptx$|\.txt$|\.msg$|\.zip$/i.test(haystack) || /document|spec|report|manual/i.test(haystack);
  }
}
