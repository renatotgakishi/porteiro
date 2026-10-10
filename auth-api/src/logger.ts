import { LoggerModule } from 'nestjs-pino';
import LokiTransport from 'pino-loki';

export const LoggerConfig = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',

    transport: {
      targets: [
        {
          target: 'pino-pretty',
          level: process.env.LOG_LEVEL ?? 'info',
          options: {
            colorize: true,
            singleLine: true,
          },
        },
        {
          target: 'pino-loki',
          level: process.env.LOG_LEVEL ?? 'info',
          options: {
            host: process.env.LOKI_HOST,
            labels: {
              app: 'backend',
              environment:
                process.env.NODE_ENV ?? 'development',
            },
            batching: true,
            interval: 5,
          },
        },
      ],
    },
  },
});