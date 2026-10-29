import { Job } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';

import { MAIL_QUEUE, MailJob } from './mail.queue';

import type { WelcomeMailData } from './mail.queue';

/** Consumer: runs in the same process by default; move it to a worker app to scale separately. */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  async process(job: Job<WelcomeMailData>): Promise<void> {
    switch (job.name) {
      case MailJob.WELCOME:
        // Replace with your mail provider (SES, Resend, SMTP...). Throwing here retries the job.
        this.logger.log(`Welcome email sent to ${job.data.email}`, {
          jobId: job.id,
          email: job.data.email,
        });
        return;
      default:
        throw new Error(`Unknown mail job: ${job.name}`);
    }
  }

  /** Fires after each failed attempt; report only when retries are exhausted. */
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    if (job && job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }

    this.logger.error(error, { jobId: job?.id, job: job?.name });
    Sentry.captureException(error, {
      tags: { queue: MAIL_QUEUE, job: job?.name },
    });
  }
}
