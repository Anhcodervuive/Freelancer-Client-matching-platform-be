import dotenv from 'dotenv'

dotenv.config({ path: '.env', quiet: true })

export const PORT = process.env.PORT || 3000
export const JWT = {
	SECRET: process.env?.JWT_SECRET ?? 'secret'
}

export const MAIL = {
	USERNAME: process.env.MAIL_USERNAME,
	PASSWORD: process.env.MAIL_PASSWORD,
	NAME: process.env.MAIL_NAME
}

export const CLIENT = {
	URL: process.env.CLIENT_URL || 'http://localhost:5173'
}

export const JWT_CONFIG_INFO = {
	ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE ?? 'secret',
	ACCESS_TOKEN_LIFE: process.env.ACCESS_TOKEN_LIFE ?? '1h',

	REFRESH_TOKEN_SECRET_SIGNATURE: process.env.REFRESH_TOKEN_SECRET_SIGNATURE ?? 'secret',
	REFRESH_TOKEN_LIFE: process.env.REFRESH_TOKEN_LIFE ?? '14 days'
}

export const NODE_ENV = process.env.NODE_ENV ?? 'development'
