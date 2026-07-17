import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock the redis createClient factory
const mockRedisClient = {
  on:       jest.fn().mockReturnThis(),
  connect:  jest.fn().mockResolvedValue(undefined),
  quit:     jest.fn().mockResolvedValue(undefined),
  get:      jest.fn(),
  set:      jest.fn(),
  setEx:    jest.fn(),
  del:      jest.fn(),
  keys:     jest.fn().mockResolvedValue([]),
  exists:   jest.fn().mockResolvedValue(0),
  incr:     jest.fn().mockResolvedValue(1),
  expire:   jest.fn().mockResolvedValue(1),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

const makeConfig = (overrides: Record<string,string> = {}) => ({
  get: jest.fn((k: string, d?: any) => overrides[k] ?? d),
});

describe('RedisService', () => {
  let service: RedisService;

  async function build(connected = true): Promise<RedisService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: makeConfig() },
      ],
    }).compile();
    const svc = module.get<RedisService>(RedisService);
    // Simulate the connect event setting isConnected
    if (connected) {
      const connectHandler = mockRedisClient.on.mock.calls.find(([ev]) => ev === 'connect')?.[1];
      if (connectHandler) connectHandler();
    }
    return svc;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await build(true);
  });

  describe('onModuleInit()', () => {
    it('calls client.connect()', async () => {
      await service.onModuleInit();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('logs a warning but does not throw when Redis is unavailable', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('get()', () => {
    it('returns parsed JSON when key exists', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));
      const result = await service.get<{ foo: string }>('my-key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('returns null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      expect(await service.get('missing')).toBeNull();
    });

    it('returns null when disconnected without throwing', async () => {
      const disconnected = await build(false);
      expect(await disconnected.get('k')).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('set()', () => {
    it('calls setEx with TTL when ttlSeconds is provided', async () => {
      await service.set('k', { v: 1 }, 60);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('k', 60, JSON.stringify({ v: 1 }));
    });

    it('calls set without TTL when ttlSeconds is not provided', async () => {
      await service.set('k', 'hello');
      expect(mockRedisClient.set).toHaveBeenCalledWith('k', '"hello"');
    });

    it('is a no-op when disconnected', async () => {
      const disconnected = await build(false);
      await disconnected.set('k', 'v');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('del()', () => {
    it('calls client.del()', async () => {
      await service.del('k');
      expect(mockRedisClient.del).toHaveBeenCalledWith('k');
    });
  });

  describe('delByPattern()', () => {
    it('deletes all keys matching the pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['k:1','k:2']);
      await service.delByPattern('k:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['k:1','k:2']);
    });

    it('skips del() when no keys match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      await service.delByPattern('no-match:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists()', () => {
    it('returns true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      expect(await service.exists('k')).toBe(true);
    });

    it('returns false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      expect(await service.exists('k')).toBe(false);
    });

    it('returns false when disconnected', async () => {
      const disconnected = await build(false);
      expect(await disconnected.exists('k')).toBe(false);
    });
  });

  describe('incr()', () => {
    it('returns incremented value', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      expect(await service.incr('counter')).toBe(5);
    });

    it('returns 0 when disconnected', async () => {
      const disconnected = await build(false);
      expect(await disconnected.incr('k')).toBe(0);
    });
  });
});
