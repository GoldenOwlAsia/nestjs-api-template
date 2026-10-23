import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ThrottlerException } from '@nestjs/throttler';

import type { ArgumentsHost } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import { Exception } from '@/utils/constants';
import { BaseException, ValidatorException } from '@/exceptions';

import { AdvancedExceptionFilter } from './base-exception.filter';
import { ValidatorExceptionFilter } from './validator-exception.filter';

// Sentry's exports are non-configurable, so mock the module instead of spying.
jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

function fakeHost() {
  const response = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  const request = { headers: { 'x-request-id': 'req-123' } };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, response, body: () => response.send.mock.calls[0][0] };
}

describe('AdvancedExceptionFilter', () => {
  const filter = new AdvancedExceptionFilter();
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
    jest.mocked(Sentry.captureException).mockClear();
  });

  it('uses the fixed public message for known statuses', () => {
    const { host, response, body } = fakeHost();

    filter.catch(new NotFoundException('row 42 missing'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(body()).toEqual({
      code: Exception.NOT_FOUND_CODE,
      status: 404,
      message: 'The resource can not be found.',
    });
  });

  it('passes other HttpExceptions through instead of hiding them', () => {
    const { host, response, body } = fakeHost();

    filter.catch(new ThrottlerException(), host);

    expect(response.status).toHaveBeenCalledWith(429);
    expect(body()).toMatchObject({
      code: Exception.BAD_REQUEST_CODE,
      status: 429,
    });
  });

  it('keeps the custom code of a BaseException', () => {
    const { host, body } = fakeHost();

    filter.catch(
      new BaseException({ code: 20_001, status: 409, message: 'Taken' }),
      host,
    );

    expect(body()).toEqual({ code: 20_001, status: 409, message: 'Taken' });
  });

  it('hides unknown errors in production but always logs them', () => {
    process.env.NODE_ENV = 'production';
    const { host, response, body } = fakeHost();
    const error = new Error('connection refused at 10.0.0.5');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(body()).toEqual({
      code: Exception.INTERNAL_ERROR_CODE,
      status: 500,
      message: 'Something went wrong!',
    });
    expect(Logger.prototype.error).toHaveBeenCalledWith(error, {
      requestId: 'req-123',
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { requestId: 'req-123' },
    });
  });

  it('exposes message and stack of unknown errors outside production', () => {
    process.env.NODE_ENV = 'development';
    const { host, body } = fakeHost();

    filter.catch(new Error('boom'), host);

    expect(body()).toMatchObject({ status: 500, message: 'boom' });
    expect(body().stack).toContain('boom');
  });

  it('does not log or report expected HTTP errors', () => {
    filter.catch(new UnauthorizedException(), fakeHost().host);

    expect(Logger.prototype.error).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('ValidatorExceptionFilter', () => {
  const filter = new ValidatorExceptionFilter();

  it('flattens nested errors into dotted paths and responds 422', () => {
    const errors = [
      { property: 'email', constraints: { isEmail: 'email must be an email' } },
      {
        property: 'address',
        children: [
          {
            property: 'city',
            constraints: { isNotEmpty: 'city should not be empty' },
          },
        ],
      },
    ] as ValidationError[];
    const { host, response, body } = fakeHost();

    filter.catch(new ValidatorException({ errors }), host);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(body()).toMatchObject({
      code: Exception.UNPROCESSABLE_ENTITY_CODE,
      status: 422,
      message: 'email must be an email',
      detail: {
        email: ['email must be an email'],
        'address.city': ['city should not be empty'],
      },
    });
  });
});
