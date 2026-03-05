import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './core/logger/logging.interceptor';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import * as fs from 'fs';
import { RequestContextService } from './common/middleware/request-context.service';

async function bootstrap() {
  const httpsOptions = process.env.NODE_ENV !== 'local' ? {} : {
    key: fs.readFileSync('./cert/key.pem'),
    cert: fs.readFileSync('./cert/cert.pem'),
  };

  const app = process.env.NODE_ENV !== 'local'
    ? await NestFactory.create(AppModule)
    : await NestFactory.create(AppModule, {
        httpsOptions,
      });

  app.enableCors({
    origin: [
      "https://localhost:3022",
      "http://localhost:3022",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept"
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

  app.useGlobalInterceptors(app.get(LoggingInterceptor));

  const requestContext = app.get(RequestContextService);
  app.use(requestIdMiddleware(requestContext));

  /**
   * IMPORTANT:
   * Preserve rawBody for Omise webhook signature verification
   */
  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
