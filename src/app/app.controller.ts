import { DataSource } from 'typeorm';
import { ServiceUnavailableException } from '@nestjs/common';

import { InjectController, InjectRoute } from '@/decorators';

import appRoutes from './app.routes';

@InjectController({
  name: 'core',
  isCore: true,
})
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  /** Readiness probe: 200 only when the database answers, 503 otherwise. */
  @InjectRoute(appRoutes.health)
  async getHealth(): Promise<{ status: 'ok'; db: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is unreachable');
    }

    return { status: 'ok', db: 'up' };
  }
}
