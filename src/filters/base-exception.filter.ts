import * as Sentry from '@sentry/nestjs';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';

import type { Request, Response } from 'express';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

import { BaseException } from '@/exceptions';
import { Exception, REQUEST_ID_HEADER } from '@/utils/constants';
import { isDevelopmentEnv } from '@/utils/helpers';

import type { IBaseExceptionResponse } from '@/exceptions';

/** App error code and (optionally) a fixed public message per HTTP status. */
const KNOWN_STATUSES: Record<number, { code: number; message?: string }> = {
  [HttpStatus.BAD_REQUEST]: { code: Exception.BAD_REQUEST_CODE },
  [HttpStatus.UNAUTHORIZED]: {
    code: Exception.UNAUTHORIZED_CODE,
    message: 'You are unauthorized.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: Exception.FORBIDDEN_CODE,
    message: 'You are unauthorized to use this resource.',
  },
  [HttpStatus.NOT_FOUND]: {
    code: Exception.NOT_FOUND_CODE,
    message: 'The resource can not be found.',
  },
};

@Catch()
export class AdvancedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AdvancedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Response {
    const header = host.switchToHttp().getRequest<Request>()?.headers?.[
      REQUEST_ID_HEADER
    ];
    // The request-id middleware always sets a single string.
    const requestId = typeof header === 'string' ? header : undefined;
    const body = this.toBody(exception, requestId);

    return host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.status)
      .send(body);
  }

  private toBody(
    exception: unknown,
    requestId?: string,
  ): IBaseExceptionResponse {
    if (exception instanceof BaseException) {
      const { code, message } = exception;

      return { code, status: exception.getStatus(), message };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const known = KNOWN_STATUSES[status];

      return {
        code:
          known?.code ??
          (status >= 500
            ? Exception.INTERNAL_ERROR_CODE
            : Exception.BAD_REQUEST_CODE),
        status,
        message: known?.message ?? exception.message,
      };
    }

    // Anything else is a bug: always log and report it (Sentry is a no-op
    // without SENTRY_DSN), and only expose details outside production.
    this.logger.error(exception, { requestId });
    Sentry.captureException(exception, { tags: { requestId } });

    const body: IBaseExceptionResponse = {
      code: Exception.INTERNAL_ERROR_CODE,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong!',
    };

    if (isDevelopmentEnv() && exception instanceof Error) {
      body.message = exception.message;
      body.stack = exception.stack;
    }

    return body;
  }
}
