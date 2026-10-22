import request from 'supertest';
import { Test } from '@nestjs/testing';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

import { configureApp } from '@/app';
import { AppModule } from '@/app/app.module';

/** Needs a migrated database: `docker compose up -d db && yarn migrate:up`. */
describe('Health and request ids (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health pings the database', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(body).toEqual({ data: { status: 'ok', db: 'up' } });
  });

  it('mints a request id and echoes a valid incoming one', async () => {
    const minted = await request(app.getHttpServer()).get('/api/v1/health');
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'trace-abc_123');
    expect(echoed.headers['x-request-id']).toBe('trace-abc_123');
  });

  it('replaces an unsafe incoming request id instead of logging it', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'evil value\twith "quotes" and spaces');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
