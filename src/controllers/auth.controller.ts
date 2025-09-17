import { NextFunction, Request, Response } from 'express'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { hashSync } from 'bcrypt'
import { CLIENT, JWT_CONFIG_INFO } from '~/config/environment'
import authService from '~/services/auth.service'
import ms from 'ms'
import { StatusCodes } from 'http-status-codes'
import { blacklistRefreshToken } from '~/helpers/blacklist'
import { JwtProvider } from '~/providers/jwt.provider'
import { DecodedToken, UserInfoToEnCode } from '~/types'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { SignUpSchema } from '~/schema/auth.schema'
import assetService from '~/services/asset.service'

/** Helper: chuẩn hoá publicUser, lấy tên/ảnh từ profile */
const toPublicUser = (u: any) => {
	const firstName = u?.profile?.firstName ?? null
	const lastName = u?.profile?.lastName ?? null
	const avatar = u?.profile?.avatar ?? null

	const { password: _pw, ...rest } = u || {}
	return {
		...rest,
		firstName,
		lastName,
		avatar
	}
}

/** Helper: chỉ pick các field primitive để đưa lên query string (tránh [object Object]) */
const pickForQuery = (publicUser: any) => {
	return {
		id: publicUser.id ?? '',
		email: publicUser.email ?? '',
		firstName: publicUser.firstName ?? '',
		lastName: publicUser.lastName ?? '',
		role: publicUser.role ?? '',
		avatar: publicUser.avatar ?? '',
		googleId: publicUser.googleId ?? ''
	}
}

export const signup = async (req: Request, res: Response, next: NextFunction) => {
	const data = SignUpSchema.parse(req.body)
	const { email, password, firstName, lastName } = data

	const existed = await prismaClient.user.findFirst({ where: { email } })
	if (existed) {
		throw new BadRequestException('User already exist', ErrorCode.USER_ALREADY_EXISTS)
	}

	// Tạo User + Profile (đưa name vào profile theo schema mới)
	const createdUser = await prismaClient.user.create({
		data: {
			email,
			password: hashSync(password, 10),
			profile: {
				create: {
					firstName: firstName || null,
					lastName: lastName || null
				}
			}
		},
		include: { profile: true }
	})

	const verifyLink = await authService.sendVerifyEmail(createdUser)

	const publicUser = toPublicUser(createdUser)

	res.status(StatusCodes.OK).json({
		user: publicUser,
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

	if (!tokenRecord) {
		throw new BadRequestException('Invalid token', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	if (tokenRecord.expiresAt < new Date()) {
		await prismaClient.emailVerifyToken.delete({ where: { token } })
		throw new BadRequestException('Token is Expired', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const existedUser = await prismaClient.user.update({
		where: { id: tokenRecord.userId },
		data: { emailVerifiedAt: new Date() },
		include: {
			profile: true
		}
	})

	await prismaClient.emailVerifyToken.delete({ where: { token } })

	const userInfo: UserInfoToEnCode = {
		id: existedUser.id,
		email: existedUser.email
	}

	const accessToken = await JwtProvider.generateToken(
		userInfo,
		JWT_CONFIG_INFO.ACCESS_TOKEN_SECRET_SIGNATURE,
		JWT_CONFIG_INFO.ACCESS_TOKEN_LIFE
	)

	const refreshToken = await JwtProvider.generateToken(
		userInfo,
		JWT_CONFIG_INFO.REFRESH_TOKEN_SECRET_SIGNATURE,
		JWT_CONFIG_INFO.REFRESH_TOKEN_LIFE
	)

	const avatarUrl = await assetService.getProfileAvatarUrl(existedUser.id)

	const publicUser = toPublicUser(existedUser)

	publicUser.avatar = avatarUrl

	res.cookie('accessToken', accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	res.cookie('refreshToken', refreshToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	return res.status(StatusCodes.OK).json(publicUser)
}

export const resendVerifyEmail = async (req: Request, res: Response, next: NextFunction) => {
	const { email } = req.params

	if (!email) {
		throw new BadRequestException('Email invalid', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const existedUser = await prismaClient.user.findFirst({ where: { email } })
	if (!existedUser) {
		throw new BadRequestException('User not founded', ErrorCode.USER_NOT_FOUND)
	}

	if (existedUser?.emailVerifiedAt) {
		throw new BadRequestException('User is verified', ErrorCode.ACCOUNT_VERIFIED)
	}

	const userId = existedUser.id
	await prismaClient.emailVerifyToken.deleteMany({ where: { userId } })

	const verifyLink = await authService.sendVerifyEmail(existedUser)

	res.status(StatusCodes.OK).json({
		message: 'Resend verify link successfully!',
		verifyLink
	})
}

export const signin = async (req: Request, res: Response, next: NextFunction) => {
	const result = await authService.signin(req.body)

	res.cookie('accessToken', result.accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	res.cookie('refreshToken', result.refreshToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	res.status(StatusCodes.OK).json(result.publicUser)
}

export const signinGoogle = async (req: Request, res: Response, next: NextFunction) => {
	// Lúc này req.user đã có thông tin user rồi (đã qua passport)
	const user = req.user
	const result = await authService.signinGoogle(user!)

	res.cookie('accessToken', result.accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	res.cookie('refreshToken', result.refreshToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	// Chỉ đẩy các field primitive cần thiết lên query string
	const qsObject = pickForQuery(result.publicUser)
	const queryString = new URLSearchParams(Object.entries(qsObject).map(([k, v]) => [k, v ?? ''])).toString()

	res.redirect(`${CLIENT.URL}/signin?${queryString}`)
}

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
	const accessToken = await authService.refreshToken(req.cookies?.refreshToken)

	res.cookie('accessToken', accessToken, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: ms('14 days')
	})

	res.status(StatusCodes.OK).json(accessToken)
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
	const refreshToken = req.cookies?.refreshToken
	if (!refreshToken) {
		throw new UnauthorizedException('Refresh token not founded', ErrorCode.UNAUTHORIED, null, StatusCodes.BAD_REQUEST)
	}
	const decoded: DecodedToken = await JwtProvider.verifyToken(
		refreshToken,
		JWT_CONFIG_INFO.REFRESH_TOKEN_SECRET_SIGNATURE
	)

	const expSec = decoded.exp!
	const ttlSec = Math.max(expSec - Math.floor(Date.now() / 1000), 1)

	await blacklistRefreshToken(refreshToken, ttlSec, req.user?.id)

	// Xoá biến thể từng set ở PROD dev trước đây
	res.clearCookie('accessToken', { path: '/', sameSite: 'none', secure: true })
	res.clearCookie('refreshToken', { path: '/', sameSite: 'none', secure: true })

	// Xoá biến thể hiện tại DEV
	res.clearCookie('accessToken', { path: '/', sameSite: 'lax', secure: false })
	res.clearCookie('refreshToken', { path: '/', sameSite: 'lax', secure: false })

	res.status(StatusCodes.OK).json({ message: 'Logout successfully' })
}
