import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { Job, Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

import { configureApp } from '@/app';
import { UserRole } from '@/common/enums';
import { AppModule } from '@/app/app.module';
import { MAIL_QUEUE, MailJob } from '@/mail/mail.queue';
import { Token } from '@/api/token/entities';
import { UsersService } from '@/api/users/users.service';
import {
  SESSIONS_QUEUE,
  PURGE_EXPIRED_SESSIONS,
} from '@/api/token/session-cleanup.processor';

/** Needs Postgres (migrated) and Redis: `docker compose up -d db redis && yarn migrate:up`. */
describe('Queues and cache (e2e)', () => {
  let app: INestApplication<App>;

  const http = () => request(app.getHttpServer());
  const makeUser = () => ({
    email: `int-${randomUUID().slice(0, 8)}@example.com`,
    password: 'P@ssw0rd',
    firstName: 'Int',
    lastName: 'Test',
    // 090 is always a valid VN mobile prefix (095, for one, is not).
    phoneNumber: `090${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`,
  });

  /** Polls until `find` returns a job in a final state (or times out). */
  const waitForJob = async (
    queue: Queue,
    find: (job: Job) => boolean,
  ): Promise<Job> => {
    for (let i = 0; i < 50; i++) {
      const jobs = await queue.getJobs(['completed', 'failed']);
      const job = jobs.find(find);

      if (job) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Job did not finish in time');
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  it('register queues a welcome email that the worker processes', async () => {
    const user = makeUser();
    await http().post('/api/v1/register').send(user).expect(201);

    const job = await waitForJob(
      app.get<Queue>(getQueueToken(MAIL_QUEUE)),
      (j) => j.name === MailJob.WELCOME && j.data.email === user.email,
    );

    expect(await job.getState()).toBe('completed');
    expect(job.data).toEqual({ email: user.email, firstName: user.firstName });
  });

  it('GET /users is cached in Redis and refreshed after a write', async () => {
    const admin = makeUser();
    await app.get(UsersService).create({ ...admin, role: UserRole.ADMIN });
    const { body } = await http()
      .post('/api/v1/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    const auth = { Authorization: `Bearer ${body.data.accessToken}` };
    const emails = async () =>
      (await http().get('/api/v1/users').set(auth).expect(200)).body.data.map(
        (u: { email: string }) => u.email,
      );

    const before = await emails();
    const created = makeUser();
    await http().post('/api/v1/users').set(auth).send(created).expect(201);

    expect(before).not.toContain(created.email);
    expect(await emails()).toContain(created.email);
  });

  it('the purge job deletes sessions older than the refresh lifetime', async () => {
    const user = makeUser();
    await http().post('/api/v1/register').send(user).expect(201);
    const { body } = await http()
      .post('/api/v1/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    const auth = { Authorization: `Bearer ${body.data.accessToken}` };
    const tokens = app.get<Repository<Token>>(getRepositoryToken(Token));
    const { sid } = JSON.parse(
      Buffer.from(body.data.accessToken.split('.')[1], 'base64url').toString(),
    );

    // Age this session past the 30-day refresh lifetime.
    await tokens.query(
      `UPDATE tokens SET updated_at = now() - interval '31 days' WHERE id = $1`,
      [sid],
    );

    const queue = app.get<Queue>(getQueueToken(SESSIONS_QUEUE));
    const added = await queue.add(PURGE_EXPIRED_SESSIONS, {});
    const job = await waitForJob(queue, (j) => j.id === added.id);

    expect(await job.getState()).toBe('completed');
    expect(job.returnvalue.deleted).toBeGreaterThanOrEqual(1);
    expect(await tokens.findOneBy({ id: sid })).toBeNull();
    await http().get('/api/v1/users/me').set(auth).expect(401);
  });
});
