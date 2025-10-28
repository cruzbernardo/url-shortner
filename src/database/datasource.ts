import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmConfigService } from 'src/config/typeorm-config.service';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  ignoreEnvFile: false,
  cache: true,
  expandVariables: true,
});

const configService = new ConfigService();
const typeOrmConfigService = new TypeOrmConfigService(configService);

const options = typeOrmConfigService.createTypeOrmOptions() as any;

// Use glob pattern for migrations - TypeORM will resolve this automatically
export const AppDataSource = new DataSource({
  ...options,
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
