import { HttpStatus } from '@nestjs/common';

import type { ValidationError } from 'class-validator';

import { Exception } from '@/utils/constants';

import { BaseException } from './base.exception';

import type { IBaseExceptionResponse } from './base.exception';

interface IBaseValidatorException extends Partial<IBaseExceptionResponse> {
  errors?: ValidationError[];
}

export class ValidatorException extends BaseException {
  protected errors: ValidationError[];

  constructor({
    errors = [],
    message = 'Unprocessable Entity',
    status = HttpStatus.UNPROCESSABLE_ENTITY,
    code = Exception.UNPROCESSABLE_ENTITY_CODE,
  }: IBaseValidatorException) {
    super({
      code,
      status,
      message,
    });

    this.errors = errors;
  }
}
