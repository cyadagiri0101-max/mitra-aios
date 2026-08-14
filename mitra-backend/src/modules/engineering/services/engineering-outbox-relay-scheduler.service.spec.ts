import { EngineeringOutboxRelayScheduler } from './engineering-outbox-relay-scheduler.service';

describe('EngineeringOutboxRelayScheduler', () => {
  let relayService: { retryAndRelay: jest.Mock };
  let config: { get: jest.Mock };
  let scheduler: EngineeringOutboxRelayScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    relayService = { retryAndRelay: jest.fn().mockResolvedValue({ rearmed: 0, relayed: 0, failed: 0 }) };
    config = { get: jest.fn().mockReturnValue('30000') };
    scheduler = new EngineeringOutboxRelayScheduler(relayService as any, config as any);
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  it('relays pending outbox rows on the configured interval', async () => {
    scheduler.onModuleInit();
    expect(config.get).toHaveBeenCalledWith('MITRA_OUTBOX_RELAY_INTERVAL_MS', '30000');

    await jest.advanceTimersByTimeAsync(30_000);
    expect(relayService.retryAndRelay).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(relayService.retryAndRelay).toHaveBeenCalledTimes(2);
  });

  it('does not overlap relay cycles while one is in flight', async () => {
    let resolveTick: () => void;
    relayService.retryAndRelay.mockImplementation(
      () => new Promise((resolve) => {
        resolveTick = () => resolve({ rearmed: 0, relayed: 1, failed: 0 } as any);
      }),
    );

    scheduler.onModuleInit();
    jest.advanceTimersByTime(30_000);
    jest.advanceTimersByTime(30_000);
    expect(relayService.retryAndRelay).toHaveBeenCalledTimes(1);

    resolveTick!();
    await Promise.resolve();
    jest.advanceTimersByTime(30_000);
    expect(relayService.retryAndRelay).toHaveBeenCalledTimes(2);
  });

  it('clears the timer on destroy', () => {
    scheduler.onModuleInit();
    scheduler.onModuleDestroy();
    jest.advanceTimersByTime(120_000);
    expect(relayService.retryAndRelay).not.toHaveBeenCalled();
  });

  it('tolerates relay failures without stopping the cycle', async () => {
    relayService.retryAndRelay.mockRejectedValueOnce(new Error('db down'));
    scheduler.onModuleInit();
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    jest.advanceTimersByTime(30_000);
    expect(relayService.retryAndRelay).toHaveBeenCalledTimes(2);
  });
});
