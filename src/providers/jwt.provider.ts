import JWT from 'jsonwebtoken'
import { DecodedToken, UserInfoToEnCode } from '~/types'

const generateToken = async (userInfo: UserInfoToEnCode, secretSignature: string, tokenLife: any) => {
	return JWT.sign(userInfo, secretSignature, {
		algorithm: 'HS256',
		expiresIn: tokenLife
	})
}

const verifyToken = async (token: string, secretSignature: string): Promise<DecodedToken> => {
	const decoded = JWT.verify(token, secretSignature)
	if (typeof decoded === 'string') {
		console.log('flag 1')
		throw new Error('Invalid token payload')
	}
	return decoded as DecodedToken
}

export const JwtProvider = {
	generateToken,
	verifyToken
}
