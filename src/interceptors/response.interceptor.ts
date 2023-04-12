import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ISuccessResponse<T> {
  data: T;
  metadata?: Record<string, unknown>;
}

interface ISuccessResponseParams<T> {
  data: T;
  metadata?: Record<string, unknown>;
}

function respond<T>(data: T | ISuccessResponseParams<T>): ISuccessResponse<T> {
  if (
    !!data &&
    typeof data === 'object' &&
    Object.prototype.hasOwnProperty.call(data as unknown as object, 'metadata')
  ) {
    const { metadata, data: datum } = data as ISuccessResponseParams<T>;

    return {
      data: datum,
      metadata,
    };
  }

  return {
    data: data as T,
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ISuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ISuccessResponse<T>> {
    return next.handle().pipe(map((data) => respond(data)));
  }
}
