import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/** Allows the request only when `:id` is the authenticated user's own id. */
@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user, params } = context.switchToHttp().getRequest();

    return !!user?.element?.id && user.element.id === params.id;
  }
}
