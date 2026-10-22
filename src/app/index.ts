import { NestFactory } from '@nestjs/core';

import type { INestApplication, LogLevel } from '@nestjs/common';

import { isDevelopmentEnv } from '@/utils/helpers';

import { AppModule } from './app.module';
import { loadGuards } from './app.guard';
import { genAPIDocument } from './app.document';
import { loadMiddlewares } from './app.middleware';
import { loadErrorHandling } from './app.exception';
import { loadInterceptors } from './app.interceptor';

/**
 * Applies prefix, versioning, guards, pipes, filters and interceptors.
 * Shared by `initApplication` and the e2e tests so both run the same stack.
 */
export const configureApp = (app: INestApplication): INestApplication => {
  loadMiddlewares(app);
  loadGuards(app);
  loadInterceptors(app);
  loadErrorHandling(app);
  app.enableShutdownHooks();

  return app;
};

export const initApplication = async (): Promise<INestApplication> => {
  const isDevEnv = isDevelopmentEnv();

  const logLevels: LogLevel[] = isDevEnv
    ? ['error', 'warn', 'log', 'verbose', 'debug']
    : ['error', 'warn', 'log'];

  const app = await NestFactory.create(AppModule, { logger: logLevels });

  configureApp(app);

  if (isDevEnv) {
    genAPIDocument(app);
  }

  return app;
};
