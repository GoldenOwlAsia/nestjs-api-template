/**
 * Sentry must initialise before any other module is loaded so it can instrument
 * them, which is why `main.ts` imports this file first. With no `SENTRY_DSN`,
 * Sentry stays disabled and every capture call is a no-op.
 */
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // 0 = errors only; raise (e.g. 0.1) to also send performance traces.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
});
