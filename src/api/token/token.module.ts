import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Token } from './entities';
import { TokenService } from './token.service';
import {
  SESSIONS_QUEUE,
  SessionCleanupProcessor,
} from './session-cleanup.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    BullModule.registerQueue({ name: SESSIONS_QUEUE }),
  ],
  providers: [TokenService, SessionCleanupProcessor],
  exports: [TokenService],
})
export class TokenModule {}
