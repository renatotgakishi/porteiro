import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiResponseMiddleware implements NestMiddleware {
  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      const statusCode = res.statusCode;

      if (
        body &&
        typeof body === 'object' &&
        'success' in body
      ) {
        return originalJson(body);
      }

      return originalJson({
        success: statusCode >= 200 && statusCode < 300,
        data: body,
        timestamp: new Date().toISOString(),
        statusCode,
      });
    };

    next();
  }
}