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

export const GOOGLE = {
	CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL
}

export const CLOUDINARY_CONFIG_INFO = {
	CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
	API_KEY: process.env.CLOUDINARY_API_KEY,
	API_SECRET: process.env.CLOUDINARY_API_SECRET,

	BASE_FOLDER: 'lvtn',

	PROFILE_FOLDER: 'user',
	PORTFOLIO_FOLDER: 'portfolio',
	JOB_ATTACHMENT_FOLDER: 'job-posts',
	MESSAGE_ATTACHMENT_FOLDER: 'messages'
}

export const R2_CONFIG = {
        ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
        ENDPOINT: process.env.R2_ENDPOINT,
        REGION: process.env.R2_REGION,
        ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
        BUCKET: process.env.R2_BUCKET,
        PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
        JOB_ATTACHMENT_PREFIX: process.env.R2_JOB_ATTACHMENT_PREFIX || 'job-posts',
        MESSAGE_ATTACHMENT_PREFIX: 'messages',
        MILESTONE_RESOURCE_PREFIX: process.env.R2_MILESTONE_RESOURCE_PREFIX || 'contract-milestones',
        MILESTONE_SUBMISSION_PREFIX:
                process.env.R2_MILESTONE_SUBMISSION_PREFIX || 'contract-milestone-submissions'
}

export const STRIPE_CONFIG_INFO = {
        API_KEY: process.env.STRIPE_API_KEY,
        FORCE_3DS: process.env.STRIPE_FORCE_3DS === 'true'
}

export const REDIS_CONFIG = {
	HOST: process.env.REDIS_HOST ?? 'localhost',
	PORT: Number(process.env.REDIS_PORT ?? '6379'),
	PASSWORD: process.env.REDIS_PASSWORD
}
