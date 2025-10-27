import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    // If DATABASE_URL is provided (Railway, Heroku, etc), use it
    if (databaseUrl) {
      return this.getConfigFromUrl(databaseUrl);
    }

    // Otherwise, use individual environment variables (Docker Compose)
    return this.getDefaultConfig();
  }

  private getConfigFromUrl(url: string): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      url,
      autoLoadEntities: true,
      migrationsRun:
        this.configService.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true',
      synchronize:
        this.configService.get<string>('TYPEORM_SYNCHRONIZE') === 'false',
      logging: this.configService.get<string>('NODE_ENV') !== 'production',
      migrations: [__dirname + '/../database/migrations/*.js'],
      ssl:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  private getDefaultConfig(): TypeOrmModuleOptions {
    return {
      type: this.configService.get<any>('DATABASE_CONNECTION', {
        infer: true,
      }),
      host: this.configService.get<string>('DATABASE_HOST', {
        infer: true,
      }),
      port: this.configService.get<number>('DATABASE_PORT', {
        infer: true,
      }),
      username: this.configService.get<string>('DATABASE_USERNAME', {
        infer: true,
      }),
      password: this.configService.get<string>('DATABASE_PASSWORD', {
        infer: true,
      }),
      database: this.configService.get<string>('DATABASE_NAME', {
        infer: true,
      }),
      schema: this.configService.get<string>('DATABASE_SCHEMA', {
        infer: true,
      }),
      autoLoadEntities: true,
      migrationsRun:
        this.configService.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true',
      synchronize:
        this.configService.get<string>('TYPEORM_SYNCHRONIZE') === 'true',
      logging: true,
      migrations: [__dirname + '/../database/migrations/*.js']
    };
  }

}
