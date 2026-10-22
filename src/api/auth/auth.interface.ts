import type { UserRole } from '@/common/enums';

export interface IValidateUserParams {
  email: string;
  role: UserRole;
  password: string;
}

export interface IValidateJwtUserParams {
  email: string;
  role: UserRole;
}

export interface ITokenPayload {
  /** Session id: primary key of the row in `tokens`. */
  sid: string;
  email: string;
  role: UserRole;
}
