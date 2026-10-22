import { mergeDeepRight } from 'ramda';

import { getEnv } from '@/utils/helpers';

import { config as defaults } from './envs/default';
import { config as test } from './envs/test';
import { config as staging } from './envs/staging';
import { config as production } from './envs/production';
import { config as development } from './envs/development';

export type TConfig = ReturnType<typeof defaults>;

const overrides: Record<string, object> = {
  test,
  staging,
  production,
  development,
};

/** Per-environment overrides in `envs/<NODE_ENV>.ts` are deep-merged over `envs/default.ts`. */
export const configuration = (): TConfig =>
  mergeDeepRight(defaults(), overrides[getEnv()] ?? {}) as TConfig;
