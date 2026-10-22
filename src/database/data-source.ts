import 'dotenv/config';
import { DataSource } from 'typeorm';

import type { DataSourceOptions } from 'typeorm';

/**
 * Single source of truth for the DB connection, used by both the Nest app
 * (DatabaseModule) and the TypeORM CLI (migrations).
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: process.env.DB_LOGGING === 'true',
  synchronize: false,
  entities: [`${__dirname}/../api/**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
};

export default new DataSource(dataSourceOptions);
