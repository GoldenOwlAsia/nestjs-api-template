import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

import { configureApp } from '@/app';
import { UserRole } from '@/common/enums';
import { AppModule } from '@/app/app.module';
import { UsersService } from '@/api/users/users.service';

/** Needs a migrated database: `docker compose up -d db && yarn migrate:up`. */
describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let http: () => ReturnType<typeof request>;

  const phone = () =>
    // 090 is always a valid VN mobile prefix (095, for one, is not).
    `090${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`;
  const makeUser = () => ({
    email: `e2e-${randomUUID().slice(0, 8)}@example.com`,
    password: 'P@ssw0rd',
    firstName: 'E2E',
    lastName: 'User',
    phoneNumber: phone(),
  });

  const register = (body: ReturnType<typeof makeUser>) =>
    http().post('/api/v1/register').send(body).expect(201);
  const login = (email: string, password: string) =>
    http().post('/api/v1/login').send({ email, password });
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Registers a customer and returns its auth header and id. */
  const customer = async () => {
    const user = makeUser();
    const { body: registered } = await register(user);
    const { body } = await login(user.email, user.password).expect(200);

    return {
      ...user,
      id: registered.data.id,
      auth: bearer(body.data.accessToken),
    };
  };

  /** There is no public way to create an admin, so seed one through the service. */
  const admin = async () => {
    const user = makeUser();
    const { id } = await app
      .get(UsersService)
      .create({ ...user, role: UserRole.ADMIN });
    const { body } = await login(user.email, user.password).expect(200);

    return { id, auth: bearer(body.data.accessToken) };
  };

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

  it('register creates a CUSTOMER and rejects a role in the body', async () => {
    const { body } = await register(makeUser());
    expect(body.data.role).toBe('CUSTOMER');
    expect(body.data.password).toBeUndefined();

    await http()
      .post('/api/v1/register')
      .send({ ...makeUser(), role: 'ADMIN' })
      .expect(422);
  });

  it('GET /users/me returns the caller, not another user', async () => {
    await customer();
    const second = await customer();

    const me = await http()
      .get('/api/v1/users/me')
      .set(second.auth)
      .expect(200);

    expect(me.body.data.email).toBe(second.email);
    expect(me.body.data.password).toBeUndefined();
    expect(me.body.data.sessions[0].accessToken).toBeUndefined();
  });

  it('rejects unknown fields and email/role changes on PUT /users/me', async () => {
    const { auth } = await customer();

    for (const body of [
      { email: 'hijack@example.com' },
      { role: 'ADMIN' },
      { nickname: 'x' },
    ]) {
      await http().put('/api/v1/users/me').set(auth).send(body).expect(422);
    }
  });

  it('hashes a password changed via PUT /users/me', async () => {
    const user = await customer();

    await http()
      .put('/api/v1/users/me')
      .set(user.auth)
      .send({ password: 'N3wP@ssw0rd' })
      .expect(200);

    await login(user.email, 'N3wP@ssw0rd').expect(200);
  });

  it('refresh rotates tokens, detects reuse, and logout revokes', async () => {
    const user = makeUser();
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
    await http().get('/api/v1/users/me').set(bearer(accessToken)).expect(401);
    await http()
      .get('/api/v1/users/me')
      .set(bearer(next.accessToken))
      .expect(200);

    await http()
      .post('/api/v1/logout')
      .set(bearer(next.accessToken))
      .expect(204);
    await http()
      .get('/api/v1/users/me')
      .set(bearer(next.accessToken))
      .expect(401);

    // Reusing an old refresh token after rotation is rejected.
    await http().post('/api/v1/refresh').send({ refreshToken }).expect(401);
  });

  it('admin-only routes reject customers', async () => {
    const { auth } = await customer();

    await http().get('/api/v1/users').set(auth).expect(403);
    await http().get(`/api/v1/users/${randomUUID()}`).set(auth).expect(403);
  });

  it('admins manage customers and themselves, not other admins', async () => {
    const root = await admin();
    const other = await admin();
    const alice = await customer();

    await http()
      .post('/api/v1/users')
      .set(root.auth)
      .send({ ...makeUser(), role: 'ADMIN' })
      .expect(201);
    await http().get(`/api/v1/users/${alice.id}`).set(root.auth).expect(200);
    await http()
      .put(`/api/v1/users/${alice.id}`)
      .set(root.auth)
      .send({ lastName: 'Tran' })
      .expect(200);
    await http()
      .put(`/api/v1/users/${root.id}`)
      .set(root.auth)
      .send({ lastName: 'Root' })
      .expect(200);
    await http()
      .put(`/api/v1/users/${other.id}`)
      .set(root.auth)
      .send({ lastName: 'X' })
      .expect(403);
    await http().delete(`/api/v1/users/${other.id}`).set(root.auth).expect(403);

    // Deleting a user cascades to their sessions.
    await http().delete(`/api/v1/users/${alice.id}`).set(root.auth).expect(200);
    await http().get('/api/v1/users/me').set(alice.auth).expect(401);
  });

  it('returns 404 for a missing id and 400 for a malformed one', async () => {
    const { auth } = await admin();

    await http().get(`/api/v1/users/${randomUUID()}`).set(auth).expect(404);
    await http().get('/api/v1/users/not-a-uuid').set(auth).expect(400);
  });
});
