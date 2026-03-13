// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        message = (res as any).message || message;
        details = (res as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Mongoose duplicate key
      if ((exception as any).code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'A record with that value already exists.';
      }
      // Mongoose validation error
      if ((exception as any).name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Validation failed';
        details = Object.values((exception as any).errors).map(
          (e: any) => e.message,
        );
      }
    }

    this.logger.error(
      `${request.method} ${request.url} → ${status}: ${message}`,
    );

    response.status(status).json({
      statusCode: status,
      error: message,
      ...(details && { details }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
