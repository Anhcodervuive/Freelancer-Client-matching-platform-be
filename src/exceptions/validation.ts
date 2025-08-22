import { ErrorCode, HttpException } from "./root";

export class UnprocessableEntityException extends HttpException {
    constructor(message: string, errorCode: ErrorCode, error?: any,) {
        super(422, message, errorCode, error)
    }
}