import type { Job } from 'bullmq';
import type { ConfigService } from '@nestjs/config';

import {
  PURGE_EXPIRED_SESSIONS,
  SessionCleanupProcessor,
} from './session-cleanup.processor';

describe('SessionCleanupProcessor', () => {
  const LIFETIME = 30 * 24 * 60 * 60 * 1000;

  const setup = () => {
    const queue = { upsertJobScheduler: jest.fn(async () => undefined) };
    const tokenService = { deleteExpired: jest.fn(async () => 4) };
    const processor = new SessionCleanupProcessor(
      queue as any,
      tokenService as any,
      { get: () => LIFETIME } as unknown as ConfigService,
    );

    return { queue, tokenService, processor };
  };

  it('deletes sessions last rotated more than one refresh lifetime ago', async () => {
    const { tokenService, processor } = setup();
    const before = Date.now();

    const result = await processor.process({
      name: PURGE_EXPIRED_SESSIONS,
    } as Job);

    const [cutoff] = tokenService.deleteExpired.mock.calls[0] as unknown as [
      Date,
    ];
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - LIFETIME);
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - LIFETIME);
    expect(result).toEqual({ deleted: 4 });
  });

  it('registers one daily scheduler, idempotently', async () => {
    const { queue, processor } = setup();

    await processor.onModuleInit();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      PURGE_EXPIRED_SESSIONS,
      { pattern: '0 3 * * *', tz: 'UTC' },
      { name: PURGE_EXPIRED_SESSIONS },
    );
  });

  it('rejects unknown job names so they fail loudly', async () => {
    await expect(
      setup().processor.process({ name: 'nope' } as Job),
    ).rejects.toThrow('Unknown sessions job');
  });
});
