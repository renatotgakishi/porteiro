import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { metricsRegistry } from './metrics';
import { HttpMetricsInterceptor } from './metrics/http-metrics.interceptor';

import { Logger } from 'nestjs-pino';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
//import { ApiResponseMiddleware } from './middleware/api-response.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  /*const apiResponseMiddleware = new ApiResponseMiddleware();

  app.use(apiResponseMiddleware.use.bind(apiResponseMiddleware));*/

  app.useLogger(app.get(Logger));

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:4001'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Identitificacao API')
    .setDescription(
      'API para gerenciamento identificacao e autenticacao de usuarios',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  app.getHttpAdapter().get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });
  app.useGlobalInterceptors(new HttpMetricsInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
