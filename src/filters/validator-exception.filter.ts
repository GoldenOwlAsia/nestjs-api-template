import { Catch, HttpStatus } from '@nestjs/common';

import type { Response } from 'express';
import type { ValidationError } from 'class-validator';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

import { Exception } from '@/utils/constants';
import { ValidatorException } from '@/exceptions';
import { isDevelopmentEnv } from '@/utils/helpers';

import type { IBaseExceptionResponse } from '@/exceptions';

export interface IValidatorExceptionResponse extends IBaseExceptionResponse {
  detail?: Record<string, string[]>;
}

/** Flattens nested DTO errors into `{ 'address.city': ['...'] }`. */
function collectMessages(
  errors: ValidationError[],
  prefix = '',
  result: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const { property, constraints, children } of errors) {
    const path = prefix ? `${prefix}.${property}` : property;

    if (constraints) {
      result[path] = Object.values(constraints);
    }

    if (children?.length) {
      collectMessages(children, path, result);
    }
  }

  return result;
}

@Catch(ValidatorException)
export class ValidatorExceptionFilter implements ExceptionFilter {
  catch(exception: ValidatorException, host: ArgumentsHost): Response {
    const detail = collectMessages(exception.errors);

    const body: IValidatorExceptionResponse = {
      code: Exception.UNPROCESSABLE_ENTITY_CODE,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message: Object.values(detail)[0]?.[0] ?? 'Invalid Information',
    };

    if (isDevelopmentEnv()) {
      body.detail = detail;
    }

    return host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.status)
      .send(body);
  }
}
