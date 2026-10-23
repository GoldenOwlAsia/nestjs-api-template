import { Logger } from '@nestjs/common';

import { MailJob } from './mail.queue';
import { MailService } from './mail.service';

describe('MailService', () => {
  const data = { email: 'bob@example.com', firstName: 'Bob' };

  it('queues a welcome job', async () => {
    const queue = { add: jest.fn(async () => ({ id: '1' })) };

    await new MailService(queue as any).sendWelcome(data);

    expect(queue.add).toHaveBeenCalledWith(MailJob.WELCOME, data);
  });

  it('does not throw when the queue is unavailable', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const queue = {
      add: jest.fn(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:6379');
      }),
    };

    await expect(
      new MailService(queue as any).sendWelcome(data),
    ).resolves.toBeUndefined();
  });
});
