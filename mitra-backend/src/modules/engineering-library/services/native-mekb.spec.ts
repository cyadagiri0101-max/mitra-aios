import { ConfigService } from '@nestjs/config';
import { EngineeringLibraryService } from './engineering-library.service';
import * as path from 'path';
import * as fs from 'fs';

describe('Native MEKB Integration & Robustness Suite (S4.1)', () => {
  let service: EngineeringLibraryService;
  let mockConfig: Partial<ConfigService>;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'EKL_BASE_URL') return ''; // No external HTTP microservice
        if (key === 'MITRA_ENGINEERING_LIBRARY_PATH') {
          return path.resolve(process.cwd(), '..', 'MitraEngineeringLibrary');
        }
        return undefined;
      }),
    };
    service = new EngineeringLibraryService(mockConfig as ConfigService);
  });

  it('should discover and read projects directly from native SQLite vault', async () => {
    const projects = await service.listProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
    const bm289 = projects.find((p) => p.id === 'BM289' || p.project_number === 'BM289');
    if (bm289) {
      expect(bm289.source).toBe('native_mekb');
      expect(bm289.project_prefix || bm289.id).toBeDefined();
    }
  });

  it('should retrieve single project detail with exact metadata', async () => {
    const projects = await service.listProjects();
    if (projects.length > 0) {
      const firstId = projects[0].id || projects[0].project_number;
      const detail = await service.getProject(firstId);
      expect(detail).toBeDefined();
      expect(detail.source).toBe('native_mekb');
    }
  });

  it('should search native MEKB database with keyword matching', async () => {
    const res = await service.search('BM');
    expect(res).toBeDefined();
    expect(res.source).toBe('native_mekb_sqlite');
    expect(Array.isArray(res.results)).toBe(true);
  });

  it('should gracefully handle missing SQLite database without unhandled crash', async () => {
    const brokenConfig: Partial<ConfigService> = {
      get: jest.fn((key: string) => {
        if (key === 'MITRA_ENGINEERING_LIBRARY_PATH') return 'C:/non_existent_vault_path_123';
        return undefined;
      }),
    };
    const brokenService = new EngineeringLibraryService(brokenConfig as ConfigService);
    await expect(brokenService.listProjects()).rejects.toThrow();
  });
});
