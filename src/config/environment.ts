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
