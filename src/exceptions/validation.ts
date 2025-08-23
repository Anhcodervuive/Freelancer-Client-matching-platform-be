import { StatusCodes } from 'http-status-codes'
import { ErrorCode, HttpException } from './root'

export class UnprocessableEntityException extends HttpException {
	constructor(message: string, errorCode: ErrorCode, error?: any) {
		super(StatusCodes.UNPROCESSABLE_ENTITY, message, errorCode, error)
	}
}
