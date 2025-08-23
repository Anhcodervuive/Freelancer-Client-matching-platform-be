import bcrypt from 'bcrypt'
import { JWT_CONFIG_INFO } from '~/config/environment'

import { prismaClient } from '~/config/prisma-client'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JwtProvider } from '~/providers/jwt.provider'
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

	if (!bcrypt.compareSync(password, existedUser.password)) {
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

export default {
	signin
}
