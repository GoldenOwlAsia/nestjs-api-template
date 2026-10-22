import { Request } from 'express';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { AuthService } from '@/api/auth/auth.service';

import type { UserRole } from '@/common/enums';
import type { TUser } from '@/api/auth/auth.service';

export interface ILocalStrategy {
  element: TUser;
  role: UserRole;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  // Runs in a guard, i.e. before the ValidationPipe: AuthService must not trust `role`.
  async validate(
    req: Request,
    email: string,
    password: string,
  ): Promise<ILocalStrategy> {
    const { role } = req.body;

    const user = await this.authService.validateUser({ email, role, password });

    return { role, element: user };
  }
}
