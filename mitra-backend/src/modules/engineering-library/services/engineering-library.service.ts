import { Injectable, Logger, BadGatewayException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class EngineeringLibraryService {
  private readonly logger = new Logger(EngineeringLibraryService.name);
  private readonly client: AxiosInstance;
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
      this.logger.log('EngineeringLibraryService operating in standalone local mode (EKL_BASE_URL not configured)');
    }
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

  private async request<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response = await this.client.request<T>({ url: path, method: 'GET', headers: this.getDefaultHeaders(), ...config });
      return response.data;
    } catch (err) {
      this.handleAxiosError(path, err);
    }
  }

  async search(query: string): Promise<any> {
    if (!query?.trim()) return { results: [] };
    const result = await this.request<any>('/search', { params: { q: query } });
    return result;
  }

  async listProjects(): Promise<any[]> {
    const result = await this.request<any>('/projects');
    return this.normalizeArray(result);
  }

  async getProject(id: string): Promise<any> {
    return this.request<any>(`/projects/${encodeURIComponent(id)}`);
  }

  async listDocuments(): Promise<any[]> {
    const result = await this.request<any>('/documents');
    return this.normalizeArray(result);
  }

  async getDocument(id: string): Promise<any> {
    return this.request<any>(`/documents/${encodeURIComponent(id)}`);
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
        status: 'fallback',
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
