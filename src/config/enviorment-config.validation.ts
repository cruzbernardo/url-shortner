import { Logger } from 'winston';
import { instance } from './winston-logger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsIn,
  validateSync,
  ValidateIf,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationError } from '@nestjs/common';

export interface IEnvironmentVariables {
  NODE_ENV: string;
  PORT: number;

  // Database - Local environment (Docker Compose)
  DATABASE_CONNECTION?: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_NAME?: string;
  DATABASE_SCHEMA?: string;

  // Database - Production environment (Railway uses DATABASE_URL)
  DATABASE_URL?: string;

  // TypeORM Configuration
  TYPEORM_SYNCHRONIZE?: string;
  TYPEORM_MIGRATIONS_RUN?: string;
  TYPEORM_MIGRATIONS?: string;

  // Encryption - Required in ALL environments
  ALGORITHM: string;
  ENCRYPT_SECRET_KEY: string;
  ENCRYPT_IV: string;

  // JWT - Required in ALL environments
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME?: string;

  // URL Shortener
  SHORT_URL_CHAR_SIZE: number;
  BASE_URL?: string; // Required in production

  // CORS - Optional
  CORS_ORIGIN?: string;

  // Logging - Optional
  LOG_LEVEL?: string;
}

export class EnvironmentVariables implements IEnvironmentVariables {
  // ============================================
  // NODE ENVIRONMENT
  // ============================================
  @IsString()
  @IsIn(['local', 'development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: string = 'local';

  @IsInt()
  @IsPositive()
  @IsOptional()
  PORT: number = 3000;

  // ============================================
  // DATABASE - Local Environment (Docker Compose)
  // ============================================
  // Obrigatório quando NODE_ENV = 'local' e não tem DATABASE_URL
  @IsString()
  @IsOptional()
  DATABASE_CONNECTION?: string;

  @ValidateIf((o) => o.NODE_ENV === 'local' && !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST?: string;

  @ValidateIf((o) => o.NODE_ENV === 'local' && !o.DATABASE_URL)
  @IsInt()
  @IsPositive()
  DATABASE_PORT?: number;

  @ValidateIf((o) => o.NODE_ENV === 'local' && !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DATABASE_USERNAME?: string;

  @ValidateIf((o) => o.NODE_ENV === 'local' && !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD?: string;

  @ValidateIf((o) => o.NODE_ENV === 'local' && !o.DATABASE_URL)
  @IsString()
  @IsNotEmpty()
  DATABASE_NAME?: string;

  @IsString()
  @IsOptional()
  DATABASE_SCHEMA = 'public';

  // ============================================
  // DATABASE - Production Environment (Railway)
  // ============================================
  // Obrigatório quando NODE_ENV = 'production'
  @ValidateIf((o) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  DATABASE_URL?: string;

  // ============================================
  // TYPEORM CONFIGURATION
  // ============================================
  @IsString()
  @IsOptional()
  TYPEORM_SYNCHRONIZE = 'false';

  @IsString()
  @IsOptional()
  TYPEORM_MIGRATIONS_RUN = 'false';

  @IsString()
  @IsOptional()
  TYPEORM_MIGRATIONS = 'dist/database/migrations/*.js';

  // ============================================
  // ENCRYPTION - Required in ALL environments
  // ============================================
  @IsString()
  @IsNotEmpty()
  ALGORITHM: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPT_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPT_IV: string;

  // ============================================
  // JWT - Required in ALL environments
  // ============================================
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION_TIME: string = '3h';

  // ============================================
  // URL SHORTENER
  // ============================================
  @IsInt()
  @IsPositive()
  SHORT_URL_CHAR_SIZE: number;

  // BASE_URL é obrigatório em production
  @ValidateIf((o) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  BASE_URL?: string;

  // ============================================
  // CORS - Optional
  // ============================================
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // ============================================
  // LOGGING - Optional
  // ============================================
  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  @IsOptional()
  LOG_LEVEL: string = 'info';
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
