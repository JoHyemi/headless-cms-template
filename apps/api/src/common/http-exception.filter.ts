import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

/**
 * Nest의 기본 에러 응답({ statusCode, message, error })을 우리 프론트엔드가 기대하는
 * { error: string } 형태로 통일합니다. class-validator의 ValidationPipe가 던지는
 * message: string[] 도 하나의 문자열로 합쳐줍니다.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse() as string | { message?: string | string[] };

    const message =
      typeof body === "string"
        ? body
        : Array.isArray(body.message)
          ? body.message.join(" ")
          : (body.message ?? exception.message);

    response.status(status).json({ error: message });
  }
}
