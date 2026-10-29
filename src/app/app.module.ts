import Joi from 'joi';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createKeyv } from '@keyv/redis';
import { BullModule } from '@nestjs/bullmq';
import { SentryModule } from '@sentry/nestjs/setup';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { configuration } from '@/config';
import { Time } from '@/utils/constants';
import { AppController } from './app.controller';

import { AuthModule } from '@/api/auth/auth.module';
import { TokenModule } from '@/api/token/token.module';
import { DatabaseModule } from '@/database/database.module';
import { UsersModule } from '@/api/users/users.module';

const EnvSchema = Joi.object({
  PORT: Joi.number(),
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  CORS_ORIGIN: Joi.string(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  SENTRY_DSN: Joi.string().uri().allow(''),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1),
});

@Module({
  imports: [
    // First, so Sentry's request instrumentation wraps everything else.
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: EnvSchema,
      load: [configuration],
    }),
    // Default: 100 requests / minute per IP. Tighten per route with @Throttle().
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: Time.ONE_MINUTE, limit: 100 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    // One Redis, two uses: the cache and the BullMQ queues.
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [createKeyv(config.get('redis.url'), { namespace: 'cache' })],
        ttl: Time.ONE_MINUTE,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get('redis.url') },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: Time.ONE_SECOND },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    AuthModule,
    TokenModule,
    UsersModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
