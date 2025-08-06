import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmConfigService } from 'src/config/typeorm-config.service';

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  ignoreEnvFile: false,
  cache: true,
  expandVariables: true,
});

const configService = new ConfigService();
const typeOrmConfigService = new TypeOrmConfigService(configService);

export const AppDataSource = new DataSource(
  typeOrmConfigService.createTypeOrmOptions() as any,
);
