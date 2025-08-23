import { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import { emailQueue } from '~/queues/email.queue'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { hashSync } from 'bcrypt'
import { CLIENT } from '~/config/environment'
import authService from '~/services/auth.service'
import ms from 'ms'
import { StatusCodes } from 'http-status-codes'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { blacklistRefreshToken } from '~/helpers/blacklist'

export const signup = async (req: Request, res: Response, next: NextFunction) => {
	const { email, password, firstName, lastName, role } = req.body

	let user = await prismaClient.user.findFirst({
		where: {
			email
		}
	})

	if (user) {
		throw new BadRequestException('User already exist', ErrorCode.USER_ALREADY_EXISTS)
	}

	const createdUser = await prismaClient.user.create({
		data: {
			email,
			password: hashSync(password, 10),
			firstName,
			lastName
		},
		select: {
			id: true,
			email: true,
			firstName: true
		}
	})

	// --- TẠO TOKEN & LƯU DB ---
	const token = crypto.randomBytes(32).toString('hex')
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 phút

	await prismaClient.emailVerifyToken.create({
		data: {
			userId: createdUser.id,
			token,
			expiresAt
		}
	})

	const verifyLink = `${CLIENT.URL}/verify?token=${token}`

	await emailQueue.add('sendVerifyEmail', {
		to: createdUser.email,
		name: createdUser.firstName,
		verifyLink
	})

	res.status(StatusCodes.OK).json({
		user: createdUser,
		verifyLink
	})
}

export const verify = async (req: Request, res: Response, next: NextFunction) => {
	const { token } = req.params

	if (!token || typeof token !== 'string') {
		throw new BadRequestException('Token not validate', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const tokenRecord = await prismaClient.emailVerifyToken.findUnique({
		where: { token },
		include: { user: true }
	})

	if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
		await prismaClient.emailVerifyToken.delete({ where: { token } })
		throw new BadRequestException('Invalid or expired token', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	// Cập nhật trạng thái xác thực email cho user
	await prismaClient.user.update({
		where: { id: tokenRecord.userId },
		data: { emailVerifiedAt: new Date() }
	})

	// Xóa token sau khi xác thực xong
	await prismaClient.emailVerifyToken.delete({ where: { token } })

	// Có thể redirect về trang login hoặc trả JSON
	return res.status(StatusCodes.OK).json({ message: 'Xác nhận email thành công! Bạn có thể đăng nhập.' })
}

export const signin = async (req: Request, res: Response, next: NextFunction) => {
	const result = await authService.signin(req.body)

	res.cookie('accessToken', result.accessToken, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		maxAge: ms('14 days')
	})

	res.cookie('refreshToken', result.refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		maxAge: ms('14 days')
	})

	res.status(StatusCodes.OK).json(result)
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
	const decoded = req.decoded
	const refreshToken = req.cookies?.refreshToken

	const expiredAt = new Date(decoded.exp * 1000) // Chuyển thành object Date JS
	console.log('Token sẽ hết hạn vào:', expiredAt.toLocaleString())
	const expMs = decoded.exp * 1000
	const nowMs = Date.now()
	const expiresInSeconds = Math.max(Math.floor((expMs - nowMs) / 1000), 1) // còn lại bao nhiêu giây

	await blacklistRefreshToken(refreshToken, expiresInSeconds, req.user?.id)

	res.clearCookie('accessToken')
	res.clearCookie('refreshToken')

	res.status(StatusCodes.OK).json({ message: 'Logout successfully' })
}
