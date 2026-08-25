import { Injectable, Logger, BadGatewayException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';

@Injectable()
export class EngineeringLibraryService {
  private readonly logger = new Logger(EngineeringLibraryService.name);
  private readonly client: AxiosInstance;
  private readonly sqlitePath: string;
  private lastSyncStatus: { syncedAt: string; projectCount: number; documentCount: number; status: string } | null = null;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('EKL_BASE_URL');
    if (baseUrl) {
      this.client = axios.create({
        baseURL: baseUrl.replace(/\/+$/, ''),
        timeout: this.configService.get<number>('EKL_TIMEOUT_MS', 30000),
        headers: {
          Accept: 'application/json',
          ...(this.configService.get<string>('EKL_API_KEY')
            ? { Authorization: `Bearer ${this.configService.get<string>('EKL_API_KEY')}` }
            : {}),
        },
      });
    } else {
      this.client = axios.create({ baseURL: 'http://localhost:8001', timeout: 5000 });
      this.logger.log('EngineeringLibraryService operating with native MEKB priority (EKL_BASE_URL not configured)');
    }

    const defaultLibPath = fs.existsSync(path.resolve(process.cwd(), 'MitraEngineeringLibrary'))
      ? path.resolve(process.cwd(), 'MitraEngineeringLibrary')
      : path.resolve(process.cwd(), '..', 'MitraEngineeringLibrary');
    const libRoot =
      this.configService.get<string>('MITRA_ENGINEERING_LIBRARY_PATH') ||
      this.configService.get<string>('ENGINEERING_LIBRARY_PATH') ||
      defaultLibPath;
    this.sqlitePath = path.normalize(path.join(libRoot, 'database', 'mekb.sqlite'));

  }

  private getDefaultHeaders() {
    return {
      'X-Request-Source': 'mitra-backend',
      'X-Request-Id': `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  private handleAxiosError(path: string, err: unknown): never {
    this.logger.error(`EKL request failed: ${path}`, err as any);
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 502;
      const message = err.response?.data?.message || err.message || 'Engineering Knowledge Library request failed';
      throw new BadGatewayException({ message: 'Engineering Knowledge Library is unavailable.', path, status, details: message });
    }
    throw new InternalServerErrorException({ message: 'Unexpected error calling Engineering Knowledge Library', path });
  }

  private normalizeArray(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && 'items' in value && Array.isArray((value as any).items)) {
      return (value as any).items;
    }
    return [];
  }

  private hasNativeSqlite(): boolean {
    return fs.existsSync(this.sqlitePath);
  }

  private openNativeDb(): DatabaseSync | null {
    if (!this.hasNativeSqlite()) return null;
    try {
      return new DatabaseSync(this.sqlitePath, { readOnly: true });
    } catch (err: any) {
      this.logger.warn(`Failed to open native MEKB SQLite DB: ${err.message}`);
      return null;
    }
  }

  private async request<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.request<T>({ url: path, method: 'GET', headers: this.getDefaultHeaders(), ...config });
    return response.data;
  }


  async search(query: string): Promise<any> {
    if (!query?.trim()) return { results: [] };
    try {
      return await this.request<any>('/search', { params: { q: query } });
    } catch (err) {
      const db = this.openNativeDb();
      if (db) {
        try {
          const q = `%${query.trim()}%`;
          const projectStmt = db.prepare('SELECT project_number as id, project_name as title, project_prefix, description FROM project_master WHERE project_number LIKE ? OR project_name LIKE ? OR description LIKE ? LIMIT 10;');
          const projects = projectStmt.all(q, q, q) as any[];
          const partStmt = db.prepare('SELECT id, description as title, material, grade, part_number FROM part_list WHERE description LIKE ? OR material LIKE ? OR part_number LIKE ? LIMIT 10;');
          const parts = partStmt.all(q, q, q) as any[];
          return {
            results: [
              ...projects.map((p) => ({ ...p, entityType: 'project', source: 'native_mekb' })),
              ...parts.map((p) => ({ ...p, entityType: 'part', source: 'native_mekb' })),
            ],
            source: 'native_mekb_sqlite',
          };
        } finally {
          db.close();
        }
      }
      throw err;
    }
  }

  async listProjects(): Promise<any[]> {
    try {
      const result = await this.request<any>('/projects');
      return this.normalizeArray(result);
    } catch (err) {
      const db = this.openNativeDb();
      if (db) {
        try {
          const stmt = db.prepare('SELECT project_number as id, project_name as name, project_prefix, description, status, revision FROM project_master ORDER BY project_number;');
          const rows = stmt.all() as any[];
          return rows.map((r) => ({ ...r, source: 'native_mekb' }));
        } finally {
          db.close();
        }
      }
      throw err;
    }
  }

  async getProject(id: string): Promise<any> {
    try {
      return await this.request<any>(`/projects/${encodeURIComponent(id)}`);
    } catch (err) {
      const db = this.openNativeDb();
      if (db) {
        try {
          const stmt = db.prepare('SELECT * FROM project_master WHERE project_number = ? OR id = ? LIMIT 1;');
          const row = stmt.get(id, id) as any;
          if (row) return { ...row, source: 'native_mekb' };
        } finally {
          db.close();
        }
      }
      throw err;
    }
  }

  async listDocuments(): Promise<any[]> {
    try {
      const result = await this.request<any>('/documents');
      return this.normalizeArray(result);
    } catch (err) {
      const db = this.openNativeDb();
      if (db) {
        try {
          const stmt = db.prepare('SELECT id, project_id, description as file_name, page_no, remarks, source_file FROM document_index ORDER BY id;');
          const rows = stmt.all() as any[];
          return rows.map((r) => ({ ...r, source: 'native_mekb' }));
        } finally {
          db.close();
        }
      }
      throw err;
    }
  }

  async getDocument(id: string): Promise<any> {
    try {
      return await this.request<any>(`/documents/${encodeURIComponent(id)}`);
    } catch (err) {
      const db = this.openNativeDb();
      if (db) {
        try {
          const stmt = db.prepare('SELECT id, project_id, description as file_name, page_no, remarks, source_file, source_sheet, source_row FROM document_index WHERE id = ? LIMIT 1;');
          const row = stmt.get(id) as any;
          if (row) return { ...row, source: 'native_mekb' };
        } finally {
          db.close();
        }
      }
      throw err;
    }
  }


  async getDashboardWidgets(): Promise<any> {
    try {
      return await this.request<any>('/dashboard/widgets');
    } catch (err) {
      this.logger.warn('EKL dashboard widget endpoint failed, falling back to counts');
      const projects = await this.listProjects();
      const documents = await this.listDocuments();
      return {
        totalProjects: projects.length,
        totalDocuments: documents.length,
        status: 'native_fallback',
      };
    }
  }

  async synchronize(): Promise<{ syncedAt: string; projectCount: number; documentCount: number; status: string }> {
    const projects = await this.listProjects();
    const documents = await this.listDocuments();
    const syncStatus = {
      syncedAt: new Date().toISOString(),
      projectCount: projects.length,
      documentCount: documents.length,
      status: 'synchronized',
    };
    this.lastSyncStatus = syncStatus;
    return syncStatus;
  }

  getSyncStatus() {
    return this.lastSyncStatus ?? { syncedAt: null, projectCount: 0, documentCount: 0, status: 'never_synced' };
  }
}
