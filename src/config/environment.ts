import dotenv from 'dotenv'

dotenv.config({ path: '.env', quiet: true })

const parseNumber = (value: string | undefined, fallback: number) => {
        if (value === undefined) return fallback
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number) => {
        if (Number.isNaN(value)) return min
        return Math.min(max, Math.max(min, value))
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
        if (value === undefined) return fallback
        const normalized = value.trim().toLowerCase()
        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
        return fallback
}

const optionalEnv = (value: string | undefined) => {
        const trimmed = value?.trim()
        return trimmed ? trimmed : undefined
}

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

export const OPENAI = {
        API_KEY: optionalEnv(process.env.OPENAI_API_KEY) ?? '',
        ORGANIZATION: optionalEnv(process.env.OPENAI_ORGANIZATION),
        PROJECT: optionalEnv(process.env.OPENAI_PROJECT)
}

const rawPauseThreshold = clamp(parseNumber(process.env.JOB_MODERATION_PAUSE_THRESHOLD, 0.4), 0, 1)
const rawRejectThreshold = clamp(parseNumber(process.env.JOB_MODERATION_REJECT_THRESHOLD, 0.7), 0, 1)

export const JOB_MODERATION = {
        ENABLED: parseBoolean(process.env.JOB_MODERATION_ENABLED, true),
        MODEL: process.env.JOB_MODERATION_MODEL ?? 'omni-moderation-latest',
        PAUSE_THRESHOLD: Math.min(rawPauseThreshold, rawRejectThreshold),
        REJECT_THRESHOLD: Math.max(rawPauseThreshold, rawRejectThreshold),
        RETRY_ATTEMPTS: Math.max(1, Math.round(parseNumber(process.env.JOB_MODERATION_RETRY_ATTEMPTS, 3))),
        RETRY_DELAY_MS: Math.max(500, Math.round(parseNumber(process.env.JOB_MODERATION_RETRY_DELAY_MS, 3000))),
        MAX_INPUT_CHARS: Math.max(500, Math.round(parseNumber(process.env.JOB_MODERATION_MAX_INPUT_CHARS, 6000)))
}
