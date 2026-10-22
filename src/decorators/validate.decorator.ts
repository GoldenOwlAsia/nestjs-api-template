import { Matches } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

import { Regex } from '@/utils/constants';

export function IsOnlyDate() {
  return applyDecorators(
    Matches(Regex.BOD, {
      message: '$property must be formatted as yyyy-mm-dd.',
    }),
  );
}

export function IsValidGender() {
  return applyDecorators(
    Matches(new RegExp(Regex.GENDER), {
      message: `$property must match ${Regex.GENDER}.`,
    }),
  );
}

export function IsValidUserRole() {
  return applyDecorators(
    Matches(new RegExp(Regex.USER_ROLE), {
      message: `$property must match ${Regex.USER_ROLE}.`,
    }),
  );
}
