import { Prisma } from '@prisma/client';
import { LoggerService } from './logger.service';

export function prismaLoggingExtension(logger: LoggerService) {
  return Prisma.defineExtension({
    name: 'logging-extension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = Date.now();

          logger.logDbRequest({
            model,
            operation,
            args,
          });

          const result = await query(args);

          logger.logDbResponse({
            model,
            operation,
            durationMs: Date.now() - start,
            resultCount: Array.isArray(result)
              ? result.length
              : result
              ? 1
              : 0,
          });

          return result;
        },
      },
    },
  });
}
