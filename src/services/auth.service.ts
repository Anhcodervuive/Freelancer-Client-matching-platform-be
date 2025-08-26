import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Profile } from 'passport-google-oauth20'

import { CLIENT, JWT_CONFIG_INFO } from '~/config/environment'

import { prismaClient } from '~/config/prisma-client'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { User } from '~/generated/prisma'
import { JwtProvider } from '~/providers/jwt.provider'
import { emailQueue } from '~/queues/email.queue'
import { UserInfoToEnCode } from '~/types'

const signin = async (reqBody: { email: string; password: string }) => {
	const { email, password } = reqBody

	const existedUser = await prismaClient.user.findFirst({
		where: {
			email
		}
	})

	if (!existedUser) {
		throw new UnauthorizedException('Account not found', ErrorCode.USER_NOT_FOUND)
	}

	if (!existedUser.emailVerifiedAt) {
		throw new UnauthorizedException('Account is not verified', ErrorCode.ACCOUNT_NOT_VERIFIED)
	}

	if (!bcrypt.compareSync(password, existedUser.password!)) {
		throw new UnauthorizedException('Password is not correct!', ErrorCode.INCORRECT_PASSWORD)
	}

	const userInfo: UserInfoToEnCode = {
		id: existedUser.id,
		email: existedUser.email,
		customExp: Date.now() + 14 * 24 * 60 * 60 * 1000
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

	const { password: _pw, ...publicUser } = existedUser

	return {
		accessToken,
		refreshToken,
		publicUser
	}
}

const signinGoogle = async (user: User) => {
	if (!user) {
		throw new UnauthorizedException('Account not found', ErrorCode.USER_NOT_FOUND)
	}

	if (!user.emailVerifiedAt) {
		throw new UnauthorizedException('Account not found', ErrorCode.USER_NOT_FOUND)
	}

	const userInfo: UserInfoToEnCode = {
		id: user.id,
		email: user.email,
		customExp: Date.now() + 14 * 24 * 60 * 60 * 1000
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

	const { password: _pw, ...publicUser } = user

	return {
		accessToken,
		refreshToken,
		publicUser
	}
}

const sendVerifyEmail = async (user: User) => {
	// --- TẠO TOKEN & LƯU DB ---
	const token = crypto.randomBytes(32).toString('hex')
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 phút

	const emailToken = await prismaClient.emailVerifyToken.create({
		data: {
			userId: user.id,
			token,
			expiresAt
		}
	})

	const verifyLink = `${CLIENT.URL}/verify?token=${emailToken.token}`

	await emailQueue.add('sendVerifyEmail', {
		to: user.email,
		name: user.firstName,
		verifyLink
	})

	return verifyLink
}

export async function findOrCreateUserFromGoogle(profile: Profile) {
	// Lấy info từ profile Google
	const googleId = profile.id
	const email = profile.emails?.[0]?.value ?? ''
	const name = profile.displayName ?? ''
	const avatar = profile.photos?.[0]?.value ?? ''

	if (!email) throw new Error('No email from Google!')

	// Tìm user theo googleId
	let user = await prismaClient.user.findFirst({
		where: {
			googleId
		}
	})

	if (user) return user

	// Nếu chưa, check đã tồn tại email này chưa
	const userByEmail = await prismaClient.user.findUnique({
		where: { email }
	})

	if (userByEmail) {
		// Đã có user đăng ký bằng email này nhưng chưa liên kết Google
		// QUĂNG LỖI custom
		const err = new UnauthorizedException(
			'Email này đã được đăng ký, vui lòng đăng nhập truyền thống rồi liên kết Google trong phần cài đặt.',
			ErrorCode.EMAIL_EXISTS
		)

		throw err
	}

	// Nếu email chưa tồn tại, tạo user mới
	user = await prismaClient.user.create({
		data: {
			email,
			firstName: name,
			avatar,
			googleId
		}
	})

	return user
}

export default {
	signin,
	signinGoogle,
	sendVerifyEmail
}
