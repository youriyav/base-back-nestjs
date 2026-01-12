import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Helmet security headers
  const isProduction = configService.get('NODE_ENV') === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );

  // CORS configuration from environment
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((origin) => origin.trim())
    : ['http://localhost:4200'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('init app API')
    .setDescription('API documentation for the Fitness Management Application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('gyms', 'Gym management endpoints')
    .addTag('members', 'Member management endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = configService.get<string>('APP_PORT');
  const DOMAIN = configService.get<string>('APP_DOMAIN') || '0.0.0.0';
  console.log('DOMAIN ' + DOMAIN);
  await app.listen(PORT ?? 3000, DOMAIN);
}

bootstrap();
