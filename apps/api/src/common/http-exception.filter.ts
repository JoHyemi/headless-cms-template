import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

/**
 * Nestのデフォルトのエラーレスポンス({ statusCode, message, error })を、フロントエンドが
 * 期待する{ error: string }の形に統一します。class-validatorのValidationPipeが投げる
 * message: string[]も1つの文字列にまとめます。
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
