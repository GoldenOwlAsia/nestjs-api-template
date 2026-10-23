import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

import type { Job } from 'bullmq';

import { MailJob } from './mail.queue';
import { MailProcessor } from './mail.processor';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

describe('MailProcessor', () => {
  const processor = new MailProcessor();
  const job = (attemptsMade: number) =>
    ({
      id: '1',
      name: MailJob.WELCOME,
      attemptsMade,
      opts: { attempts: 3 },
    }) as unknown as Job;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.mocked(Sentry.captureException).mockClear();
  });

  it('processes a welcome job', async () => {
    await expect(
      processor.process({
        ...job(0),
        data: { email: 'bob@example.com', firstName: 'Bob' },
      } as Job),
    ).resolves.toBeUndefined();
  });

  it('fails unknown job names so they are not silently dropped', async () => {
    await expect(
      processor.process({ ...job(0), name: 'nope' } as Job),
    ).rejects.toThrow('Unknown mail job');
  });

  it('reports to Sentry only once retries are exhausted', () => {
    const error = new Error('SMTP down');

    processor.onFailed(job(1), error);
    processor.onFailed(job(2), error);
    expect(Sentry.captureException).not.toHaveBeenCalled();

    processor.onFailed(job(3), error);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
