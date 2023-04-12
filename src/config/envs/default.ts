import { Time } from '@/utils/constants';

export const config = {
  db: {
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,

    username: process.env.DB_USERNAME || 'username',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'dbname',

    entities: [`${__dirname}/../../api/**/*.entity.{js,ts}`],

    logging: false,
    synchronize: false,
    autoLoadEntities: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },
  code: {
    resetPassword: {
      lifetime: 5 * Time.ONE_MINUTE,
    },
  },
  email: {
    transport: {
      service: 'gmail',
      host: 'smtp.gmail.com',
      auth: {
        user: process.env.MAIL_USERNAME || 'username',
        pass: process.env.MAIL_PASSWORD || 'password',
      },
    },
    options: {
      from: `"Basic NestJS Template" <${process.env.MAIL_USERNAME}>`,
    },
  },
  swagger: {
    siteTitle: 'Basic NestJS Template | Documentation',
    title: 'Basic NestJS Template | Documentation',
    description: 'The Basic NestJS Template API Documentation',
    version: '1.0',
    bearerAuth: {
      type: 'http',
      in: 'Header',
      scheme: 'Bearer',
      bearerFormat: 'Bearer',
      name: 'Authorization',
      description: 'Please enter JWT token',
    },
  },
};
