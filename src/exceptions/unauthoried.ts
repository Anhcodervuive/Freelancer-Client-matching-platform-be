import { StatusCodes } from 'http-status-codes'
import { HttpException } from './root'

export class UnauthorizedException extends HttpException {
	constructor(message: string, errorCode: number, errors?: any) {
		super(StatusCodes.UNAUTHORIZED, message, errorCode, errors)
	}
}
