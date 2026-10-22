import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';

export const loadMiddlewares = (app: INestApplication): void => {
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Comma-separated allow-list, e.g. CORS_ORIGIN=https://app.example.com,https://admin.example.com
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });

  /**
   * ! If you use GraphQL, we can have some problems
   * * We should add options below, then it will work okay
   * contentSecurityPolicy: (process.env.NODE_ENV === 'production') ? undefined : false
   * crossOriginEmbedderPolicy: (process.env.NODE_ENV === 'production') ? undefined : false
   */
  app.use(helmet());

  app.use(compression());

  app.use(cookieParser());
};
