import { BadRequestException } from '@nestjs/common';

export class UserAlreadyException extends BadRequestException {
  constructor() {
    super('User with that email or phone number already exists.');
  }
}

export class WrongCredentialsException extends BadRequestException {
  constructor() {
    super('Wrong credentials provided.');
  }
}
