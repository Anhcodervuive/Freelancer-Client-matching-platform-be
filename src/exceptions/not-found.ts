import { ErrorCode, HttpException } from "./root";

export class NotFoundException extends HttpException {
  constructor(message: string, errorCode: ErrorCode, error?: any) {
    super(404, message, errorCode, error);
  }
}
