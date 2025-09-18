import { Request, Response, NextFunction } from 'express'
import { ErrorCode, HttpException } from '~/exceptions/root'
import { InternalServerException } from '~/exceptions/internal-server'
import { ZodError } from 'zod'
import { UnprocessableEntityException } from '~/exceptions/validation'

export const errorHandler = (method: Function) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await method(req, res, next)
		} catch (error: any) {
			let exception: HttpException
			if (error instanceof HttpException) {
				exception = error
			} else if (error instanceof ZodError) {
				exception = new UnprocessableEntityException(error.message, ErrorCode.UNPROCESSABLE_ENTITY, error)
                        } else {
                                exception = new InternalServerException('Đã có lỗi xảy ra, vui lòng thử lại sau.', ErrorCode.INTERNAL_SERVER_ERROR, error)
			}
			console.log(exception)
			next(exception)
		}
	}
}
