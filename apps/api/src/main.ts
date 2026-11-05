import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { uploadDir } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.set('trust proxy', 1);

  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const dir = uploadDir();
  mkdirSync(dir, { recursive: true });
  app.useStaticAssets(dir, { prefix: '/api/uploads', maxAge: '7d' });

  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`Eduventure API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
