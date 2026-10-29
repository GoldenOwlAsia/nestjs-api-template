import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';

import { TokenService } from './token.service';

export const SESSIONS_QUEUE = 'sessions';
export const PURGE_EXPIRED_SESSIONS = 'purge-expired-sessions';

/**
 * Deletes sessions whose refresh token can no longer be valid. A row's
 * `updated_at` moves on every rotation, so `updated_at + refresh lifetime`
 * is when its newest refresh token expired. Runs daily at 03:00 UTC.
 */
@Processor(SESSIONS_QUEUE)
export class SessionCleanupProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(SessionCleanupProcessor.name);

  constructor(
    @InjectQueue(SESSIONS_QUEUE) private readonly queue: Queue,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  /** Idempotent: every instance upserts the same scheduler, so it exists once. */
  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      PURGE_EXPIRED_SESSIONS,
      { pattern: '0 3 * * *', tz: 'UTC' },
      { name: PURGE_EXPIRED_SESSIONS },
    );
  }

  async process(job: Job): Promise<{ deleted: number }> {
    if (job.name !== PURGE_EXPIRED_SESSIONS) {
      throw new Error(`Unknown sessions job: ${job.name}`);
    }

    const lifetime = this.configService.get<number>('token.refresh.lifetime');
    const deleted = await this.tokenService.deleteExpired(
      new Date(Date.now() - lifetime),
    );

    this.logger.log(`Purged ${deleted} expired session(s)`, { deleted });

    return { deleted };
  }
}
