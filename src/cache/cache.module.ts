import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-ioredis';
import { CacheInterceptor } from './cache.interceptor';

const cacheModule2 = CacheModule.registerAsync({
  useFactory: () => ({
    store: redisStore,
    host: process.env.EC2_REDIS_HOST,
    port: Number(process.env.EC2_REDIS_PORT),
    password: process.env.EC2_REDIS_PASSWORD,
  }),
});

@Module({
  providers: [CacheInterceptor],
  imports: [cacheModule2],
  exports: [cacheModule2],
})
export class CustomCacheModule {}
