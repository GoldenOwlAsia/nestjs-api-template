import { NestFactory } from '@nestjs/core';
import { LogLevel } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';

import { isDevelopmentEnv } from '@/utils/helpers';

import { AppModule } from './app.module';
import { loadGuards } from './app.guard';
import { genAPIDocument } from './app.document';
import { loadMiddlewares } from './app.middleware';
import { loadErrorHandling } from './app.exception';
import { loadInterceptors } from './app.interceptor';

export const initApplication = async (): Promise<INestApplication> => {
  const isDevEnv = isDevelopmentEnv();

  let logLevels: LogLevel[] = ['error', 'log', 'warn'];

  if (isDevEnv) {
    logLevels = ['error', 'warn', 'log', 'verbose', 'debug'];
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  loadMiddlewares(app);

  loadGuards(app);

  loadInterceptors(app);

  loadErrorHandling(app);

  if (isDevEnv) {
    genAPIDocument(app);
  }

  return app;
};
