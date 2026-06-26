import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Dev: allow all origins; prod: restrict to CORS_ORIGINS.
  app.enableCors({
    origin: env.NODE_ENV === 'development' ? true : env.CORS_ORIGINS,
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle('EasyTech3D API')
    .setDescription('Storefront backend — catalog (Phase 1).')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(env.PORT);
  // eslint-disable-next-line no-console
  console.log(`EasyTech3D API listening on http://localhost:${env.PORT}  (docs: /docs)`);
}

void bootstrap();
