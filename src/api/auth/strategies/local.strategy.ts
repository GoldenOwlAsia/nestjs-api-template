import { Request } from 'express';
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

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

  async validate(req: Request): Promise<ILocalStrategy> {
    const { role } = req.body;

    const user = await this.authService.validateUser(req.body);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      role,
      element: user,
    };
  }
}
