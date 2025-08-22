import { ErrorCode, HttpException } from "./root";

export class InternalServerException extends HttpException {
  constructor(message: string, errorCode: ErrorCode, error?: any) {
    super(500, message, errorCode, error);
  }
}
