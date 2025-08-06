import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const CustomValidationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory(errors: ValidationError[]) {
    throw new HttpException(
      { message: getAllConstraints(errors) },
      HttpStatus.BAD_REQUEST,
    );
  },
});

export const getAllConstraints = (errors: ValidationError[]): string[] => {
  return errors.reduce<string[]>((list, current) => {
    if (current.children?.length) {
      list.push(...getAllConstraints(current.children));
    }
    if (current.constraints) {
      list.push(...Object.values(current.constraints));
    }
    return list;
  }, []);
};
