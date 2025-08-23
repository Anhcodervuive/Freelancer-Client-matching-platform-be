import { StatusCodes } from 'http-status-codes'
import { ErrorCode, HttpException } from './root'

export class InternalServerException extends HttpException {
	constructor(message: string, errorCode: ErrorCode, error?: any) {
		super(StatusCodes.INTERNAL_SERVER_ERROR, message, errorCode, error)
	}
}
