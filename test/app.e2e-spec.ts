import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

import { configureApp } from '@/app';
import { AppModule } from '@/app/app.module';
import { AdminService } from '@/api/admin/admin.service';

/** Needs a migrated database: `docker compose up -d db && yarn migrate:up`. */
describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let http: () => ReturnType<typeof request>;

  const uniq = randomUUID().slice(0, 8);
  const phone = () =>
    `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const makeCustomer = () => ({
    role: 'CUSTOMER',
    email: `e2e-${randomUUID().slice(0, 8)}@example.com`,
    password: 'P@ssw0rd',
    firstName: 'E2E',
    lastName: uniq,
    phoneNumber: phone(),
  });

  const register = (body: ReturnType<typeof makeCustomer>) =>
    http().post('/api/v1/register').send(body).expect(201);
  const login = (email: string, password: string) =>
    http().post('/api/v1/login').send({ role: 'CUSTOMER', email, password });
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = () =>
      request(app.getHttpServer()) as unknown as ReturnType<typeof request>;
  });

  afterAll(() => app.close());

  it('GET /health', () => http().get('/api/v1/health').expect(200));

  it('GET /customers/me returns the caller, not another user', async () => {
    const first = makeCustomer();
    const second = makeCustomer();
    await register(first);
    await register(second);

    const { body } = await login(second.email, second.password).expect(200);
    const me = await http()
      .get('/api/v1/customers/me')
      .set(bearer(body.data.accessToken))
      .expect(200);

    expect(me.body.data.email).toBe(second.email);
    expect(me.body.data.password).toBeUndefined();
    expect(me.body.data.sessions[0].accessToken).toBeUndefined();
  });

  it('rejects unknown fields and unknown roles', async () => {
    const user = makeCustomer();
    await register(user);
    const { body } = await login(user.email, user.password).expect(200);

    await http()
      .put('/api/v1/customers/me')
      .set(bearer(body.data.accessToken))
      .send({ email: 'hijack@example.com' })
      .expect(422);

    await http()
      .post('/api/v1/login')
      .send({ role: 'customer', email: user.email, password: user.password })
      .expect(400);
  });

  it('hashes a password changed via PUT /me', async () => {
    const user = makeCustomer();
    await register(user);
    const { body } = await login(user.email, user.password).expect(200);

    await http()
      .put('/api/v1/customers/me')
      .set(bearer(body.data.accessToken))
      .send({ password: 'N3wP@ssw0rd' })
      .expect(200);

    await login(user.email, 'N3wP@ssw0rd').expect(200);
  });

  it('refresh rotates tokens, detects reuse, and logout revokes', async () => {
    const user = makeCustomer();
    await register(user);
    const { body: loggedIn } = await login(user.email, user.password).expect(
      200,
    );
    const { accessToken, refreshToken } = loggedIn.data;

    const { body: refreshed } = await http()
      .post('/api/v1/refresh')
      .send({ refreshToken })
      .expect(200);
    const next = refreshed.data;
    expect(next.refreshToken).not.toBe(refreshToken);

    // The pre-rotation access token is no longer the session's current one.
    await http()
      .get('/api/v1/customers/me')
      .set(bearer(accessToken))
      .expect(401);
    await http()
      .get('/api/v1/customers/me')
      .set(bearer(next.accessToken))
      .expect(200);

    await http()
      .post('/api/v1/logout')
      .set(bearer(next.accessToken))
      .expect(204);
    await http()
      .get('/api/v1/customers/me')
      .set(bearer(next.accessToken))
      .expect(401);

    // Reusing an old refresh token after rotation is rejected.
    await http().post('/api/v1/refresh').send({ refreshToken }).expect(401);
  });

  it('returns 404 for a missing id and 400 for a malformed one', async () => {
    const admin = { ...makeCustomer(), role: 'ADMIN' };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...adminData } = admin;
    await app.get(AdminService).create(adminData);

    const { body } = await http()
      .post('/api/v1/login')
      .send({ role: 'ADMIN', email: admin.email, password: admin.password })
      .expect(200);
    const auth = bearer(body.data.accessToken);

    await http().get(`/api/v1/customers/${randomUUID()}`).set(auth).expect(404);
    await http().get('/api/v1/customers/not-a-uuid').set(auth).expect(400);
  });
});
