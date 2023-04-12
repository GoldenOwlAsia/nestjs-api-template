import { Time } from '@/utils/constants';

export const config = {
  db: {
    // type: process.env.DB_TYPE || 'postgres',
    // host: process.env.DB_HOST || 'localhost',
    // port: process.env.DB_PORT || 5432,

    // username: process.env.DB_USERNAME || 'username',
    // password: process.env.DB_PASSWORD || 'password',
    // database: process.env.DB_NAME || 'dbname',

    // entities: [`${__dirname}/../../api/**/*.entity.{js,ts}`],

    logging: true,
    // synchronize: true,
    // autoLoadEntities: true,
  },
  token: {
    authentication: {
      lifetime: 30 * Time.ONE_DAY,
      renewedTimes: 4,
    },
  },
};
