import JWT from 'jsonwebtoken'
import { UserInfoToEnCode } from '~/types'

const generateToken = async (userInfo: UserInfoToEnCode, secretSignature: string, tokenLife: any) => {
	return JWT.sign(userInfo, secretSignature, {
		algorithm: 'HS256',
		expiresIn: tokenLife
	})
}

const verifyToken = async (token: string, secretSignature: string) => {
	return JWT.verify(token, secretSignature)
}

export const JwtProvider = {
	generateToken,
	verifyToken
}
