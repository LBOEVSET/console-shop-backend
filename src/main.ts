import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './core/logger/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestContextService } from './common/middleware/request-context.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      // API Gateway (internal — routes all external traffic)
      process.env.GATEWAY_URL || 'http://localhost:8000',
      // Direct browser origins (kept for local dev)
      process.env.WEB_URL || 'https://localhost:3022',
      'http://localhost:3022',
      'https://localhost:3022',
      // Admin panel
      process.env.ADMIN_URL || 'http://localhost:3030',
      'http://localhost:3030',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      // Trusted headers forwarded by the API Gateway
      'X-User-ID',
      'X-User-Role',
      'X-User-Email',
      'X-Guest-ID',
      'X-Internal-Secret',
      'X-Request-ID',
    ],
  });
  
  app.use(cookieParser());

  // Enable shutdown hooks
  app.enableShutdownHooks();

  // Enable API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  app.useGlobalInterceptors(
    app.get(LoggingInterceptor),
    new TransformInterceptor(),
  );

  const requestContext = app.get(RequestContextService);
  app.use(requestIdMiddleware(requestContext));

  app.use(bodyParser.json());

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(`Application is running on port: ${process.env.PORT || 3000}`);
  console.log(`Zone: ${process.env.ZONE ?? 'local'}`);
}

bootstrap();
