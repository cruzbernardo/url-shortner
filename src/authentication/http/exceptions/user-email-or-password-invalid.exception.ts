import { HttpException, HttpStatus } from '@nestjs/common';

export class emailOrPasswordInvalidException extends HttpException {
  constructor(error?: any) {
    super(
      {
        message: 'email/password invalid',
        stack: error,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
