import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';

@Global() // Makes Prisma available everywhere without re-importing
@Module({
  providers: [PrismaService, RequestContextService],
  exports: [PrismaService],
})
export class PrismaModule {}
