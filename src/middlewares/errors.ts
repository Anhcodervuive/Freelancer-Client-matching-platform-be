import { NextFunction, Request, Response } from 'express'
import { HttpException } from '../exceptions/root'

export const errorMiddleware = (err: HttpException, req: Request, res: Response, next: NextFunction) => {
	return res.status(typeof err.statusCode === 'number' ? err.statusCode : 500).json({
		message: err.message,
		errorCode: err.errorCode,
		errors: err.errors
	})
}
