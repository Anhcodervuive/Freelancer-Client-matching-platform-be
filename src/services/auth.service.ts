import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Profile as GoogleProfile } from 'passport-google-oauth20'

import { CLIENT, JWT_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { User } from '~/generated/prisma'
import { blacklistRefreshToken } from '~/helpers/blacklist'
import { JwtProvider } from '~/providers/jwt.provider'
import { emailQueue } from '~/queues/email.queue'
import { UserInfoToEnCode } from '~/types'
import assetService from './asset.service'

/** Chuẩn hoá dữ liệu trả về cho FE, giữ tương thích cũ */
const toPublicUser = (u: User & { profile?: any }) => {
        const profile = u.profile
        return {
                id: u.id,
                email: u.email,
                role: u.role,
                ...profile
        }
}

const findActiveBanForUser = async (userId: string) => {
        const ban = await (prismaClient as any).userBan.findFirst({
                where: { userId, liftedAt: null },
                orderBy: { createdAt: 'desc' }
        })

        if (!ban) {
                return null
        }

        if (ban.expiresAt && ban.expiresAt <= new Date()) {
                return null
        }

        return ban
}

const signup = async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
        const { email, password, firstName, lastName } = data

        const existed = await prismaClient.user.findFirst({ where: { email } })
        if (existed) {
                throw new BadRequestException('User already exist', ErrorCode.USER_ALREADY_EXISTS)
        }

        const createdUser = await prismaClient.user.create({
                data: {
                        email,
                        isActive: false,
                        password: bcrypt.hashSync(password, 10),
                        profile: {
                                create: {
                                        firstName: firstName || null,
                                        lastName: lastName || null
                                }
                        }
                },
                include: { profile: true }
        })

        const verifyLink = await sendVerifyEmail(createdUser)

        const avatarUrl = await assetService.getProfileAvatarUrl(createdUser.id)
        const publicUser = {
                ...toPublicUser(createdUser as any),
                avatar: avatarUrl
        }

        return {
                user: publicUser,
                verifyLink
        }
}

const signin = async (reqBody: { email: string; password: string }) => {
        const { email, password } = reqBody

        const existedUser = await prismaClient.user.findFirst({
                where: { email },
		include: { profile: true } // <-- quan trọng: lấy kèm profile
	})

	if (!existedUser) {
		throw new UnauthorizedException('Account not found', ErrorCode.USER_NOT_FOUND)
	}

	if (!existedUser.emailVerifiedAt) {
		throw new UnauthorizedException('Account is not verified', ErrorCode.ACCOUNT_NOT_VERIFIED)
	}

        if (!existedUser.password || !bcrypt.compareSync(password, existedUser.password)) {
                throw new UnauthorizedException('Password is not correct!', ErrorCode.INCORRECT_PASSWORD)
        }

        if (!existedUser.isActive) {
                throw new UnauthorizedException('Account is inactive', ErrorCode.ACCOUNT_INACTIVE)
        }

        const activeBan = await findActiveBanForUser(existedUser.id)
        if (activeBan) {
                throw new UnauthorizedException('Account is banned', ErrorCode.ACCOUNT_BANNED)
        }

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
                // Với Google, user mới tạo đã được set emailVerifiedAt (ở hàm findOrCreateUserFromGoogle)
                throw new UnauthorizedException('Account not found', ErrorCode.USER_NOT_FOUND)
        }

        if (!user.isActive) {
                throw new UnauthorizedException('Account is inactive', ErrorCode.ACCOUNT_INACTIVE)
        }

        const activeBan = await findActiveBanForUser(user.id)
        if (activeBan) {
                throw new UnauthorizedException('Account is banned', ErrorCode.ACCOUNT_BANNED)
        }

        const userInfo: UserInfoToEnCode = {
                id: user.id,
                email: user.email
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

	// load lại kèm profile để trả publicUser đầy đủ
        const fresh = await prismaClient.user.findUnique({
                where: { id: user.id },
                include: { profile: true }
        })

        const avatarUrl = await assetService.getProfileAvatarUrl(user.id)

        const publicUser = toPublicUser(fresh as any)

        publicUser.avatar = avatarUrl

        const requiresOnboarding = !fresh?.role

        return {
                accessToken,
                refreshToken,
                publicUser,
                requiresOnboarding
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

	// lấy tên từ profile (fallback sang email nếu rỗng)
	const profile = await prismaClient.profile.findUnique({ where: { userId: user.id } })
	const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user.email

	await emailQueue.add('sendVerifyEmail', {
		to: user.email,
		name,
		verifyLink
	})

        return verifyLink
}

const verifyEmailToken = async (token: string) => {
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

        if (!tokenRecord.user) {
                throw new BadRequestException('Invalid token', ErrorCode.UNPROCESSABLE_ENTITY)
        }

        const shouldActivate = !tokenRecord.user.emailVerifiedAt

        const existedUser = await prismaClient.user.update({
                where: { id: tokenRecord.userId },
                data: {
                        emailVerifiedAt: new Date(),
                        ...(shouldActivate ? { isActive: true } : {})
                },
                include: { profile: true }
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

        const publicUser = {
                ...toPublicUser(existedUser as any),
                avatar: avatarUrl
        }

        return {
                accessToken,
                refreshToken,
                publicUser
        }
}

export async function findOrCreateUserFromGoogle(googleProfile: GoogleProfile) {
        // Lấy info từ profile Google
        const googleId = googleProfile.id
        const email = googleProfile.emails?.[0]?.value ?? ''
	const avatar = googleProfile.photos?.[0]?.value ?? ''
	const givenName = (googleProfile as any).name?.givenName as string | undefined
	const familyName = (googleProfile as any).name?.familyName as string | undefined

	if (!email) throw new Error('No email from Google!')

	// Tìm user theo googleId
	let user = await prismaClient.user.findFirst({
		where: { googleId }
	})
	if (user) return user

	// Nếu chưa, check đã tồn tại email này chưa
	const userByEmail = await prismaClient.user.findUnique({
		where: { email }
	})

	if (userByEmail) {
		// Đã có user đăng ký bằng email nhưng chưa liên kết Google
		throw new UnauthorizedException(
			'Email này đã được đăng ký, vui lòng đăng nhập truyền thống rồi liên kết Google trong phần cài đặt.',
			ErrorCode.EMAIL_EXISTS
		)
	}

	// Nếu email chưa tồn tại, tạo user mới + profile
        user = await prismaClient.user.create({
                data: {
                        email,
                        googleId,
                        isActive: true,
                        emailVerifiedAt: new Date(), // Google coi như đã verified
                        profile: {
                                create: {
                                        firstName: givenName ?? null,
                                        lastName: familyName ?? null
                                }
                        }
                }
        })

	// Lấy URL image của gg để tạo asset
	const newAsset = await prismaClient.asset.create({
		data: {
			url: avatar ?? null,
			kind: 'IMAGE'
		}
	})
	await prismaClient.assetLink.create({
		data: {
			ownerType: 'USER',
			ownerId: user.id,
			role: 'AVATAR',
			asset: {
				connect: { id: newAsset.id }
			}
		}
	})

	return user
}

const refreshToken = async (clientRefreshToken: string) => {
        const refreshTokenDecoded = await JwtProvider.verifyToken(
                clientRefreshToken,
                JWT_CONFIG_INFO.REFRESH_TOKEN_SECRET_SIGNATURE
        )

        const userInfo: UserInfoToEnCode = {
                id: refreshTokenDecoded.id,
                email: refreshTokenDecoded.email
        }

        const accessToken = await JwtProvider.generateToken(
                userInfo,
                JWT_CONFIG_INFO.ACCESS_TOKEN_SECRET_SIGNATURE,
                JWT_CONFIG_INFO.ACCESS_TOKEN_LIFE
        )

        return accessToken
}

const resendVerifyEmail = async (email: string) => {
        const existedUser = await prismaClient.user.findFirst({ where: { email } })
        if (!existedUser) {
                throw new BadRequestException('User not founded', ErrorCode.USER_NOT_FOUND)
        }

        if (existedUser.emailVerifiedAt) {
                throw new BadRequestException('User is verified', ErrorCode.ACCOUNT_VERIFIED)
        }

        await prismaClient.emailVerifyToken.deleteMany({ where: { userId: existedUser.id } })

        const verifyLink = await sendVerifyEmail(existedUser)

        return {
                message: 'Resend verify link successfully!',
                verifyLink
        }
}

const logoutWithBlacklist = async (refreshToken: string, userId?: string) => {
        const decoded = await JwtProvider.verifyToken(
                refreshToken,
                JWT_CONFIG_INFO.REFRESH_TOKEN_SECRET_SIGNATURE
        )

        const expSec = decoded.exp
        if (!expSec) {
                throw new UnauthorizedException('Refresh token not valid', ErrorCode.UNAUTHORIED)
        }

        const ttlSec = Math.max(expSec - Math.floor(Date.now() / 1000), 1)

        await blacklistRefreshToken(refreshToken, ttlSec, userId)
}

export default {
        signup,
        signin,
        signinGoogle,
        sendVerifyEmail,
        verifyEmailToken,
        resendVerifyEmail,
        refreshToken,
        logoutWithBlacklist
}
