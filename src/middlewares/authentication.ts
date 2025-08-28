import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { JsonWebTokenError } from 'jsonwebtoken'
import { JWT_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JwtProvider } from '~/providers/jwt.provider'

const authenticateMiddleware = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Lấy token từ cookie
		const token = req.cookies?.accessToken
		if (!token) {
			return next(new UnauthorizedException('No token provided', ErrorCode.UNAUTHORIED))
		}

		// Xác thực token
		const decoded = await JwtProvider.verifyToken(token, JWT_CONFIG_INFO.ACCESS_TOKEN_SECRET_SIGNATURE)

		const user = await prismaClient.user.findFirst({
			where: { id: decoded.id! }
		})

		if (!user) {
			return next(new UnauthorizedException('user not found while verify', ErrorCode.UNAUTHORIED))
		}

		req.user = user // Lưu user vào req
		req.decoded = decoded
		next()
	} catch (error) {
		// Sử dụng 1 mã lỗi 410 để trả về nếu accessToken hết hạn, trình duyệt se gọi refreshToken
		if (error instanceof JsonWebTokenError) {
			return next(new UnauthorizedException('Token is not validated', ErrorCode.UNAUTHORIED, null, StatusCodes.GONE))
		}
		return next(new UnauthorizedException('Unauthorized', ErrorCode.UNAUTHORIED))
	}
}

export default authenticateMiddleware
