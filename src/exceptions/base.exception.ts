import { HttpException, HttpStatus } from '@nestjs/common';

export interface IBaseExceptionResponse {
  code: number;
  status: number;
  message: string;
  stack?: string;
}

export class BaseException extends HttpException {
  public code: number;

  constructor({
    code = 10_000,
    message = 'Something went wrong!',
    status = HttpStatus.INTERNAL_SERVER_ERROR,
  }: IBaseExceptionResponse) {
    super(message, status);

    this.code = code;
  }
}
