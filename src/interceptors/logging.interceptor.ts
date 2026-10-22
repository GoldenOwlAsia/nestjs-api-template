import {
  Logger,
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const { method, originalUrl } = http.getRequest<Request>();
    const startedAt = Date.now();

    const log = (status: number) =>
      this.logger.log(
        `${method} ${originalUrl} ${status} ${Date.now() - startedAt}ms`,
      );

    return next.handle().pipe(
      tap({
        next: () => log(http.getResponse<Response>().statusCode),
        // Filters run after interceptors, so read the status off the error itself.
        error: (error) => log(error?.getStatus?.() ?? 500),
      }),
    );
  }
}
