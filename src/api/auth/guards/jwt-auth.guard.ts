import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

import type { Observable } from 'rxjs';
import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '@/utils/constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
