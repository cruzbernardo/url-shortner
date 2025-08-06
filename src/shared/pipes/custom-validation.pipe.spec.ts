import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  CustomValidationPipe,
  getAllConstraints,
} from './custom-validation.pipe';
import { IsNotEmpty, ValidationError } from 'class-validator';

class TestModel {
  @IsNotEmpty({ message: 'any_message' })
  testValue: string;
}

describe('CustomValidationPipe', () => {
  const validationPipe = CustomValidationPipe;
  it('should be able to create a new pipe', async () => {
    expect(validationPipe).toBeInstanceOf(ValidationPipe);
  });

  it('should be able to throw a Bad Request error', async () => {
    const metadata: ArgumentMetadata = {
      type: 'query',
      metatype: TestModel,
      data: '',
    };
    await expect(validationPipe.transform({}, metadata)).rejects.toThrow(
      new HttpException({ message: ['any_message'] }, HttpStatus.BAD_REQUEST),
    );
  });
});

describe('getAllConstraints', () => {
  it('should be able to get all error messages from an error', () => {
    const errors: ValidationError[] = [
      {
        property: 'any_property',
        target: {},
        constraints: {
          any_constraint: 'any_error',
          any_constraint2: 'any_error2',
          any_constraint3: 'any_error3',
          any_constraint4: 'any_error4',
        },
      },
    ];
    const result = getAllConstraints(errors);

    expect(result).toStrictEqual([
      'any_error',
      'any_error2',
      'any_error3',
      'any_error4',
    ]);
  });

  it('should be able to get all error messages from a list of errors', () => {
    const errors: ValidationError[] = [
      {
        property: 'any_property',
        target: {},
        constraints: {
          any_constraint1: 'any_error',
        },
      },
      {
        property: 'any_property',
        target: {},
        constraints: {
          any_constraint2: 'any_error2',
        },
      },
      {
        property: 'any_property',
        target: {},
        children: [
          {
            property: 'any_property',
            target: {},
            constraints: {
              any_constraint3: 'any_error3',
            },
          },
        ],
      },
    ];
    const result = getAllConstraints(errors);

    expect(result).toStrictEqual(['any_error', 'any_error2', 'any_error3']);
  });

  it('should not return message if not have error', () => {
    const errors: ValidationError[] = [];

    const result = getAllConstraints(errors);

    expect(result).toStrictEqual([]);
  });
});
