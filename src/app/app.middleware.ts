import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { Logger, VersioningType } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '@/utils/constants';

// Client-supplied ids go into logs, so accept only short, plain tokens.
const SAFE_REQUEST_ID = /^[\w-]{1,128}$/;

const httpLogger = new Logger('HTTP');

/**
 * Tags each request with an id (a valid incoming `x-request-id`, e.g. from a proxy,
 * or a fresh one), echoes it back, and logs the request when the response is sent.
 * Logging here rather than in an interceptor also covers requests that guards,
 * the throttler or the router reject before any interceptor runs.
 */
function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();
  const startedAt = Date.now();

  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  res.on('finish', () => {
    const { method, originalUrl: url } = req;
    const { statusCode: status } = res;
    const durationMs = Date.now() - startedAt;

    // Structured params: their own fields in JSON logs, appended in text logs.
    httpLogger.log(`${method} ${url} ${status} ${durationMs}ms`, {
      requestId,
      method,
      url,
      status,
      durationMs,
    });
  });

  next();
}

export const loadMiddlewares = (app: INestApplication): void => {
  app.use(requestContext);

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
