import { StatusCodes } from 'http-status-codes'
import { HttpException } from './root'

export class ForbiddenException extends HttpException {
	constructor(message: string, errorCode: number, errors?: any, statusCode?: any) {
		super(statusCode ?? StatusCodes.FORBIDDEN, message, errorCode, errors)
	}
}
