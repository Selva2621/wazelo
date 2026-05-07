import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { StructuredLogger } from './infrastructure/logger/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Use structured logger as the application logger (EPIC 10)
  const structuredLogger = app.get(StructuredLogger);
  app.useLogger(structuredLogger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 8080);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const frontendUrl = configService.get<string>(
    'app.frontendUrl',
    'http://localhost:3000',
  );

  // Cookie parser — required for httpOnly refresh token cookie
  app.use(cookieParser());

  // Security — relax CSP/CORP for uploaded media served cross-origin to frontend
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', 'blob:', frontendUrl],
        },
      },
    }),
  );

  // CORS — include x-trace-id header for client-side correlation
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-trace-id', 'x-requested-with'],
    exposedHeaders: ['x-trace-id'],
  });

  // Files are served through the authenticated FileServeController
  // Do NOT use app.useStaticAssets() for uploads — it bypasses auth guards

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global pipes and interceptors
  // NOTE: GlobalExceptionFilter is now registered via APP_FILTER in AppModule
  // so it has access to injected dependencies (StructuredLogger, ErrorTrackingService)
  app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  structuredLogger.log(`Application running on port ${port}`, 'Bootstrap');
  structuredLogger.log(`API prefix: ${apiPrefix}`, 'Bootstrap');
  structuredLogger.log(`CORS origin: ${frontendUrl}`, 'Bootstrap');
}

bootstrap();
