import { ServiceUnavailableException } from '@nestjs/common';

import type { DataSource } from 'typeorm';

import { AppController } from './app.controller';

describe('AppController health', () => {
  const controller = (query: () => Promise<unknown>) =>
    new AppController({ query } as unknown as DataSource);

  it('reports ok when the database answers', async () => {
    await expect(
      controller(async () => [{ '?column?': 1 }]).getHealth(),
    ).resolves.toEqual({ status: 'ok', db: 'up' });
  });

  it('fails with 503 when the database is unreachable', async () => {
    const health = controller(async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    }).getHealth();

    await expect(health).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(health).rejects.toMatchObject({ status: 503 });
  });
});
