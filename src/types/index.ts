import { JwtPayload } from 'jsonwebtoken'

export interface UserInfoToEnCode {
	id: string
	email: string
}

export type DecodedToken = JwtPayload & UserInfoToEnCode
