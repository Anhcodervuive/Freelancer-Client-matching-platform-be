import { NextFunction, Request, Response } from 'express'
import passport from 'passport'
import { CLIENT } from '~/config/environment'
import { ErrorCode, HttpException } from '~/exceptions/root'

// Middleware xử lý passport + bắt lỗi
export const googleAuthHandler = (req: Request, res: Response, next: NextFunction) => {
	passport.authenticate('google', { session: false }, (err, user, info) => {
		if (err) {
			if ((err as HttpException).errorCode === ErrorCode.EMAIL_EXISTS) {
				// Quăng lỗi về FE dạng redirect hoặc JSON
				return res.redirect(`${CLIENT.URL}/signin?error=${encodeURIComponent(err.message)}`)
			}
			const message = 'Lỗi không xác định'
			return res.redirect(`${CLIENT.URL}/signin?error=${encodeURIComponent(message)}`)
		}
		if (!user) {
			const message = 'Không tìm thấy user'
			return res.redirect(`${CLIENT.URL}/signin?error=${encodeURIComponent(message)}`)
		}
		// Nếu thành công: gán user vào req, gọi next sang controller
		req.user = user
		return next()
	})(req, res, next)
}
