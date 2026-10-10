import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { httpRequestDuration, httpRequestsTotal } from '../metrics';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const duration =
          Number(process.hrtime.bigint() - start) / 1_000_000_000;

        const route = request.route?.path ?? request.path;
        const method = request.method;
        const statusCode = response.statusCode.toString();

        httpRequestsTotal.inc({
          method,
          route,
          status_code: statusCode,
        });

        httpRequestDuration.observe(
          {
            method,
            route,
            status_code: statusCode,
          },
          duration,
        );
      }),
    );
  }
}
