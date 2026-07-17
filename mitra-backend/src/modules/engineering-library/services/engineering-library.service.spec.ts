import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { EngineeringLibraryService } from './engineering-library.service';

describe('EngineeringLibraryService', () => {
  let service: EngineeringLibraryService;
  let mockConfig: Partial<ConfigService>;
  let mockClient: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'EKL_BASE_URL') return 'http://ekl.test';
        if (key === 'EKL_API_KEY') return 'token';
        if (key === 'EKL_TIMEOUT_MS') return 1000;
        return undefined;
      }),
    };
    mockClient = {
      request: jest.fn(),
    };
    jest.spyOn(axios, 'create').mockReturnValue(mockClient as any);
    service = new EngineeringLibraryService(mockConfig as ConfigService);
  });

  it('should query EKL search with query parameter', async () => {
    mockClient.request.mockResolvedValue({ data: { results: [{ id: 'p1' }] } });
    const result = await service.search('test');
    expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({ url: '/search', method: 'GET', params: { q: 'test' } }));
    expect(result).toEqual({ results: [{ id: 'p1' }] });
  });

  it('should return empty search results for blank query', async () => {
    const result = await service.search('');
    expect(result).toEqual({ results: [] });
    expect(mockClient.request).not.toHaveBeenCalled();
  });

  it('should normalize project list responses to an array', async () => {
    mockClient.request.mockResolvedValue({ data: [{ id: 'project1' }] });
    const projects = await service.listProjects();
    expect(projects).toEqual([{ id: 'project1' }]);
  });

  it('should throw BadGatewayException when EKL request fails', async () => {
    mockClient.request.mockRejectedValue({ isAxiosError: true, response: { status: 502, data: { message: 'Service unavailable' } }, message: 'Bad gateway' });
    await expect(service.listProjects()).rejects.toThrow(BadGatewayException);
  });

  it('should synchronize and store last sync status', async () => {
    mockClient.request.mockResolvedValueOnce({ data: [{ id: 'p1' }] });
    mockClient.request.mockResolvedValueOnce({ data: [{ id: 'd1' }] });
    const status = await service.synchronize();
    expect(status.projectCount).toBe(1);
    expect(status.documentCount).toBe(1);
    expect(status.status).toBe('synchronized');
    expect(service.getSyncStatus().status).toBe('synchronized');
  });
});
