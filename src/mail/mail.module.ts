import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { MAIL_QUEUE } from './mail.queue';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE })],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
