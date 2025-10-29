import { ConfigService } from '@nestjs/config';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

export const redisConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    return {
      store: redisStore,
      url: redisUrl,
      ttl: configService.get<number>('REDIS_TTL', 3600),
      isGlobal: true,
    } as CacheModuleOptions;
  }

  return {
    store: redisStore,
    host: configService.get<string>('REDIS_HOST', 'redis'),
    port: configService.get<number>('REDIS_PORT', 6379),
    ttl: configService.get<number>('REDIS_TTL', 3600),
    isGlobal: true,
  } as CacheModuleOptions;
};
