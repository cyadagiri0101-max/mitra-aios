import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import helmet from 'helmet';
import compression from 'compression';

// ── Startup environment validation ───────────────────────────────────────────
// Fail immediately if required secrets are missing so misconfigured containers
// never silently start with broken auth or missing credentials.
function validateEnv(): void {
  // These must ALWAYS be present in every environment
  const REQUIRED = ['JWT_SECRET', 'DB_PASSWORD'];

  // These must be present in production only
  const REQUIRED_PROD = ['MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];

  const isProd = process.env.NODE_ENV === 'production';
  const toCheck = isProd ? [...REQUIRED, ...REQUIRED_PROD] : REQUIRED;

  const missing = toCheck.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    console.error('\n[MITRA] ❌ Missing required environment variables:');
    missing.forEach((k) => console.error(`  • ${k}`));
    console.error('\nCopy .env.example → .env and fill in all REPLACE_WITH_... values.');
    console.error('Generate secrets: openssl rand -hex 32\n');
    process.exit(1);
  }

  const PLACEHOLDER_PATTERNS = [
    'REPLACE_WITH_',
    'changeme',
    'secret',
    'password',
    '12345',
  ];

  if (isProd) {
    const hasWeak = REQUIRED.some((k) =>
      PLACEHOLDER_PATTERNS.some((w) => (process.env[k] ?? '').toLowerCase().includes(w)),
    );
    if (hasWeak) {
      console.error('\n[MITRA] ❌ JWT_SECRET or DB_PASSWORD contains a weak/placeholder value.');
      console.error('Run: openssl rand -hex 32  to generate a secure secret.\n');
      process.exit(1);
    }
  }
}

// Skip validation in test environment (Jest sets NODE_ENV=test)
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

// Harden DB_SYNC — never allow synchronize=true in production
const isProd = process.env.NODE_ENV === 'production';
if (isProd && process.env.DB_SYNC === 'true') {
  console.error('[MITRA] ❌ DB_SYNC=true is not allowed in production');
  process.exit(1);
}

async function bootstrap() {
  const logger = new StructuredLoggerService();

  const app = await NestFactory.create(AppModule, { logger });

  const isProd = process.env.NODE_ENV === 'production';

  // ── Request ID middleware (must be first for log correlation) ──────────────
  const reqIdMiddleware = new RequestIdMiddleware();
  app.use(reqIdMiddleware.use.bind(reqIdMiddleware));

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc:  ["'self'"],
              styleSrc:   ["'self'", "'unsafe-inline'"],
              imgSrc:     ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'"],
              frameSrc:   ["'none'"],
              objectSrc:  ["'none'"],
            },
          }
        : false,
    }),
  );

  // ── Compression ────────────────────────────────────────────────────────────
  app.use(compression());

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      const isLocalOrigin = (() => {
        if (!origin) return false;
        try {
          const hostname = new URL(origin).hostname;
          return hostname === 'localhost' || hostname === '127.0.0.1';
        } catch {
          return false;
        }
      })();

      // Allow requests with no Origin header (curl, health checks, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || isLocalOrigin) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge:         86400,
  });

  // ── Global prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation pipe ────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:             true,
      forbidNonWhitelisted:  true,
      transform:             true,
      stopAtFirstError:      false,
    }),
  );

  // ── Response serialization (@Exclude on sensitive fields) ─────────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Swagger — dev + staging only (dynamic import so it is NOT bundled in prod) ─
  if (!isProd) {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const doc = new DocumentBuilder()
      .setTitle('MITRA v3.2 API')
      .setDescription('Mold Development Lifecycle Management — dev/staging only')
      .setVersion('3.2.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
    logger.log(
      `Swagger → http://localhost:${process.env.PORT ?? 3001}/api/docs`,
      'Bootstrap',
    );
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Allows NestJS to call onModuleDestroy() hooks on SIGTERM/SIGINT,
  // giving services (Redis, DB pool) time to flush and close cleanly.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(
    `MITRA v3.2 → http://0.0.0.0:${port}/api [${isProd ? 'production' : 'development'}]`,
    'Bootstrap',
  );
}
bootstrap();
