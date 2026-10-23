import { Queue } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { MAIL_QUEUE, MailJob } from './mail.queue';

import type { WelcomeMailData } from './mail.queue';

/** Producer: request handlers enqueue mail here; `MailProcessor` sends it. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue) {}

  /** Best effort: a Redis outage must not fail the sign-up that triggered it. */
  async sendWelcome(data: WelcomeMailData): Promise<void> {
    try {
      await this.queue.add(MailJob.WELCOME, data);
    } catch (error) {
      this.logger.error(error, { job: MailJob.WELCOME });
      Sentry.captureException(error, { tags: { queue: MAIL_QUEUE } });
    }
  }
}
