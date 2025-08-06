import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return this.getDefaultConfig();
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
