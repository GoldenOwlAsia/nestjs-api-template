import { Time } from '@/utils/constants';

/** A function so `process.env` is read when ConfigModule loads, after `.env` is parsed. */
export const config = () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },
  token: {
    access: { lifetime: 15 * Time.ONE_MINUTE },
    refresh: { lifetime: 30 * Time.ONE_DAY },
  },
  swagger: {
    siteTitle: 'NestJS API Template | Documentation',
    title: 'NestJS API Template | Documentation',
    description: 'The NestJS API Template API Documentation',
    version: '1.0',
  },
});
