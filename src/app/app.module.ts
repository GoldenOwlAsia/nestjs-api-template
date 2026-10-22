import Joi from 'joi';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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
});

@Module({
  imports: [
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
    AuthModule,
    TokenModule,
    UsersModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
