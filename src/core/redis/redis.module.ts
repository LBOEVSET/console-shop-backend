import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';

@Global()
@Module({
  providers: [RedisService, RequestContextService],
  exports: [RedisService],
})
export class RedisModule {}
