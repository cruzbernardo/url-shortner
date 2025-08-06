import { Logger } from 'winston';
import { instance } from './winston-logger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationError } from '@nestjs/common';

export interface IEnvironmentVariables {
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_SCHEMA: string;

  ALGORITHM: string;
  ENCRYPT_SECRET_KEY: string;
  ENCRYPT_IV: string;

  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: string;

  SHORT_URL_CHAR_SIZE: number;
}

export class EnvironmentVariables implements IEnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsInt()
  @IsPositive()
  DATABASE_PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  DATABASE_SCHEMA = 'public';

  @IsString()
  @IsOptional()
  TYPEORM_SYNCHRONIZE = 'false';

  @IsString()
  @IsOptional()
  TYPEORM_MIGRATIONS_RUN = 'false';

  @IsString()
  @IsOptional()
  TYPEORM_MIGRATIONS = 'dist/database/migrations/*.js';

  @IsString()
  @IsNotEmpty()
  ALGORITHM: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPT_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPT_IV: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRATION_TIME: string;

  @IsInt()
  @IsPositive()
  SHORT_URL_CHAR_SIZE: number;
}

export const validateEnvironment = (
  config: Record<string, unknown>,
  logger: Logger = instance,
): EnvironmentVariables => {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    logger.error('❌ Invalid environment variables', {
      context: 'ConfigValidation',
      validationErrors: formatErrors(errors),
    });
    throw new Error('Invalid environment variables');
  }

  logger.info('✅ Environment variables validated', {
    context: 'ConfigValidation',
  });

  return validated;
};

const formatErrors = (errors: ValidationError[]) =>
  errors.map((err) => ({
    property: err.property,
    value: err.value,
    constraints: err.constraints,
  }));
