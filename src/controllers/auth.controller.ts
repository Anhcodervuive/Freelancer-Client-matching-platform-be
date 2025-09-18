import { NextFunction, Request, Response } from 'express'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { CLIENT } from '~/config/environment'
import authService from '~/services/auth.service'
import ms from 'ms'
import { StatusCodes } from 'http-status-codes'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { SignUpSchema } from '~/schema/auth.schema'

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
        const result = await authService.signup(data)

        res.status(StatusCodes.OK).json(result)
}

export const verify = async (req: Request, res: Response, next: NextFunction) => {
        const { token } = req.params

        if (!token || typeof token !== 'string') {
                throw new BadRequestException('Token not validate', ErrorCode.UNPROCESSABLE_ENTITY)
        }

        const { accessToken, refreshToken, publicUser } = await authService.verifyEmailToken(token)

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

        const result = await authService.resendVerifyEmail(email)

        res.status(StatusCodes.OK).json(result)
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

        const redirectPath = result.requiresOnboarding ? '/onboarding' : '/signin'

        res.redirect(`${CLIENT.URL}${redirectPath}?${queryString}`)
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

        await authService.logoutWithBlacklist(refreshToken, req.user?.id)

        // Xoá biến thể từng set ở PROD dev trước đây
        res.clearCookie('accessToken', { path: '/', sameSite: 'none', secure: true })
        res.clearCookie('refreshToken', { path: '/', sameSite: 'none', secure: true })

	// Xoá biến thể hiện tại DEV
	res.clearCookie('accessToken', { path: '/', sameSite: 'lax', secure: false })
	res.clearCookie('refreshToken', { path: '/', sameSite: 'lax', secure: false })

	res.status(StatusCodes.OK).json({ message: 'Logout successfully' })
}
