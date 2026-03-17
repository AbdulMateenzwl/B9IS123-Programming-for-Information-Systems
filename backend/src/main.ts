// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // Auto-transform types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://expenses.deloitteedge.co.uk']
        : ['http://localhost:4200', 'http://localhost:3001'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`   DeloitteEdge Expense API running on port ${port}`);
  logger.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  logger.log(`   MongoDB     : ${process.env.MONGO_URI}`);
  logger.log(`   Health      : http://localhost:${port}/api`);
}

bootstrap();
