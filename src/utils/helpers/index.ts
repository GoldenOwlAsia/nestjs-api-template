import { Env } from '@/utils/constants';

import hash from './hash';

const getEnv = (): string => process.env.NODE_ENV || Env.DEVELOPMENT;

const isDevelopmentEnv = (): boolean => getEnv() !== Env.PRODUCTION;

export { getEnv, isDevelopmentEnv, hash };
