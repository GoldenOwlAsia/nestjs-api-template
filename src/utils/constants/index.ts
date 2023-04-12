import Time from './time';
import Regex from './regex';
import Exception from './exception';

const ROLES_KEY = 'roles';
const IS_PUBLIC_KEY = 'isPublic';

const Env = {
  STAGING: 'staging',
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
};

export { ROLES_KEY, IS_PUBLIC_KEY, Env, Time, Regex, Exception };
