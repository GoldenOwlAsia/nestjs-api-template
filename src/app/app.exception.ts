import { ValidationPipe } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import { ValidatorException } from '@/exceptions';
import { AdvancedExceptionFilter, ValidatorExceptionFilter } from '@/filters';

export const loadErrorHandling = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return new ValidatorException({ errors: validationErrors });
      },
    }),
  );

  app.useGlobalFilters(
    new AdvancedExceptionFilter(),
    new ValidatorExceptionFilter(),
  );
};
