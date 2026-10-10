import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              level: 'info',
              options: {
                colorize: true,
                singleLine: true,
              },
            },
            {
              target: 'pino-loki',
              level: 'info',
              options: {
                host: 'http://localhost:3100',
                batching: true,
                interval: 5,
                labels: {
                  app: 'auth-api',
                  environment: 'development',
                },
              },
            },
          ],
        },
      },
    }),
  ],
})
export class LoggerConfigModule {}