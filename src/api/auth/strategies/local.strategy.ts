import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { AuthService } from '@/api/auth/auth.service';

import type { User } from '@/api/users/entities';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  // Runs in a guard, i.e. before the ValidationPipe: the body is not validated here.
  async validate(email: string, password: string): Promise<User> {
    return this.authService.validateUser(email, password);
  }
}
