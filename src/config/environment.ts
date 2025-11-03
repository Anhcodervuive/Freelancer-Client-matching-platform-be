import fs from 'fs'
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

const stripWrappingQuotes = (value: string | undefined) => {
        if (!value) return value
        const trimmed = value.trim()
        if (trimmed.length < 2) return trimmed
        const firstChar = trimmed[0]
        const lastChar = trimmed[trimmed.length - 1]
        if ((firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")) {
                return trimmed.slice(1, -1)
        }
        return trimmed
}

const optionalEnv = (value: string | undefined) => {
        const trimmed = stripWrappingQuotes(value)
        return trimmed ? trimmed : undefined
}

const normaliseFilePath = (filePath: string | undefined) => {
        if (!filePath) return undefined
        const stripped = stripWrappingQuotes(filePath)
        if (!stripped) return undefined
        return stripped.startsWith('@') ? stripped.slice(1) : stripped
}

const readOptionalFile = (filePath: string | undefined) => {
        const normalised = normaliseFilePath(filePath)
        if (!normalised) return undefined
        try {
                return fs.readFileSync(normalised, 'utf8')
        } catch {
                return undefined
        }
}

const tryParseJson = <T>(value: string): T | undefined => {
        try {
                return JSON.parse(value) as T
        } catch {
                return undefined
        }
}

type ServiceAccountCredentials = {
        client_email: string
        private_key: string
        token_uri?: string
        project_id?: string
        [key: string]: unknown
}

const isServiceAccountCredentials = (value: unknown): value is ServiceAccountCredentials => {
        if (!value || typeof value !== 'object') return false
        const record = value as Record<string, unknown>
        return typeof record.client_email === 'string' && typeof record.private_key === 'string'
}

const parseServiceAccountCandidate = (candidate: string | undefined) => {
        if (!candidate) return undefined

        const stripped = stripWrappingQuotes(candidate)
        if (!stripped) return undefined

        const fileContent = readOptionalFile(stripped)
        if (fileContent) {
                const parsed = tryParseJson<ServiceAccountCredentials>(fileContent)
                if (parsed && isServiceAccountCredentials(parsed)) {
                        return parsed
                }
        }

        const direct = tryParseJson<ServiceAccountCredentials>(stripped)
        if (direct && isServiceAccountCredentials(direct)) {
                return direct
        }

        try {
                const decoded = Buffer.from(stripped, 'base64').toString('utf8')
                const parsed = tryParseJson<ServiceAccountCredentials>(decoded)
                if (parsed && isServiceAccountCredentials(parsed)) {
                        return parsed
                }
        } catch {
                // ignore base64 parse errors
        }

        return undefined
}

const parseServiceAccount = (): ServiceAccountCredentials | undefined => {
        const rawInline = process.env.PERSPECTIVE_SERVICE_ACCOUNT_JSON
        const rawFile = process.env.PERSPECTIVE_SERVICE_ACCOUNT_FILE

        return parseServiceAccountCandidate(rawInline) ?? parseServiceAccountCandidate(rawFile)
}

const parseStringList = (value: string | undefined, fallback: string[]): string[] => {
        if (!value) return fallback
        const items = value
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0)
        return items.length > 0 ? items : fallback
}

const parseModerationProvider = (value: string | undefined): 'openai' | 'perspective' => {
        const normalized = value?.trim().toLowerCase()
        if (normalized === 'perspective') return 'perspective'
        return 'openai'
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

export const PERSPECTIVE = {
        API_KEY: optionalEnv(process.env.PERSPECTIVE_API_KEY),
        ENDPOINT:
                optionalEnv(process.env.PERSPECTIVE_ENDPOINT) ??
                'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
        LANGUAGES: parseStringList(process.env.PERSPECTIVE_LANGUAGES, ['vi', 'en']),
        ATTRIBUTES: parseStringList(
                process.env.PERSPECTIVE_ATTRIBUTES,
                ['TOXICITY', 'SEVERE_TOXICITY', 'SEXUAL_EXPLICIT', 'INSULT', 'THREAT', 'PROFANITY']
        ),
        SERVICE_ACCOUNT: parseServiceAccount()
}

const configuredModerationProviderRaw = process.env.JOB_MODERATION_PROVIDER
const hasExplicitModerationProvider = optionalEnv(configuredModerationProviderRaw) !== undefined
const configuredModerationProvider = parseModerationProvider(configuredModerationProviderRaw)

const resolvedModerationProvider = hasExplicitModerationProvider
        ? configuredModerationProvider
        : !OPENAI.API_KEY && (PERSPECTIVE.API_KEY || PERSPECTIVE.SERVICE_ACCOUNT)
          ? 'perspective'
          : configuredModerationProvider

const rawPauseThreshold = clamp(parseNumber(process.env.JOB_MODERATION_PAUSE_THRESHOLD, 0.4), 0, 1)
const rawRejectThreshold = clamp(parseNumber(process.env.JOB_MODERATION_REJECT_THRESHOLD, 0.7), 0, 1)

export const JOB_MODERATION = {
        ENABLED: parseBoolean(process.env.JOB_MODERATION_ENABLED, true),
        CONFIGURED_PROVIDER: configuredModerationProvider,
        PROVIDER: resolvedModerationProvider,
        MODEL: process.env.JOB_MODERATION_MODEL ?? 'omni-moderation-latest',
        PAUSE_THRESHOLD: Math.min(rawPauseThreshold, rawRejectThreshold),
        REJECT_THRESHOLD: Math.max(rawPauseThreshold, rawRejectThreshold),
        RETRY_ATTEMPTS: Math.max(1, Math.round(parseNumber(process.env.JOB_MODERATION_RETRY_ATTEMPTS, 3))),
        RETRY_DELAY_MS: Math.max(500, Math.round(parseNumber(process.env.JOB_MODERATION_RETRY_DELAY_MS, 3000))),
        WORKER_CONCURRENCY: Math.max(
                1,
                Math.round(parseNumber(process.env.JOB_MODERATION_WORKER_CONCURRENCY, 1))
        ),
        MAX_INPUT_CHARS: Math.max(500, Math.round(parseNumber(process.env.JOB_MODERATION_MAX_INPUT_CHARS, 6000))),
        LOG_VERBOSE: parseBoolean(process.env.JOB_MODERATION_LOG_VERBOSE, true)
}
