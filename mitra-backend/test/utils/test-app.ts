import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

/**
 * Builds a fully-wired Nest application for e2e tests, replicating the
 * pipes/interceptors/prefix configured in src/main.ts so that request
 * validation, response serialization (@Exclude on entity fields), and
 * route prefixes behave identically to production.
 *
 * Deliberately omits: helmet, compression, CORS, Swagger, shutdown hooks —
 * none of these affect functional API behaviour under test.
 */
export async function createTestApp(): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.init();

  return { app, moduleRef };
}
