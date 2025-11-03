import crypto from 'crypto'

import { JobStatus, Prisma } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { JOB_MODERATION, OPENAI, PERSPECTIVE } from '~/config/environment'
import { jobModerationQueue } from '~/queues/job-moderation.queue'
import type { JobModerationQueuePayload, JobModerationTrigger } from '~/schema/job-moderation.schema'
import { logModeration, logModerationError } from './job-moderation.logger'

const MODERATION_ENDPOINT = 'https://api.openai.com/v1/moderations'
const PERSPECTIVE_ENDPOINT = PERSPECTIVE.ENDPOINT
const PERSPECTIVE_OAUTH_SCOPES = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/cloud-language'
]
const PERSPECTIVE_TOKEN_URI =
        (PERSPECTIVE.SERVICE_ACCOUNT?.token_uri as string | undefined) ?? 'https://oauth2.googleapis.com/token'

type PerspectiveTokenCache = {
        token: string | null
        expiresAt: number
}

const perspectiveTokenCache: PerspectiveTokenCache = {
        token: null,
        expiresAt: 0
}

const formatCategoryLabel = (category: string | null | undefined) => {
        if (!category) return 'an toàn'
        return category.replace(/_/g, ' ')
}

const formatScore = (score: number | null | undefined) => {
        if (score === null || score === undefined || Number.isNaN(score)) return '0.00'
        return score.toFixed(2)
}

const truncateInput = (value: string, maxLength: number) => {
        if (value.length <= maxLength) return value
        if (maxLength <= 3) return value.slice(0, maxLength)
        return `${value.slice(0, maxLength - 3)}...`
}

const base64UrlEncode = (value: Buffer | string) => {
        const buffer = typeof value === 'string' ? Buffer.from(value) : value
        return buffer
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '')
}

const normalisePrivateKey = (key: string) => (key.includes('\\n') ? key.replace(/\\n/g, '\n') : key)

type PerspectiveServiceAccount = NonNullable<typeof PERSPECTIVE.SERVICE_ACCOUNT>

const createServiceAccountAssertion = (serviceAccount: PerspectiveServiceAccount, scopes: string[]) => {
        const header = { alg: 'RS256', typ: 'JWT' }
        const issuedAt = Math.floor(Date.now() / 1000)
        const expiresAt = issuedAt + 3600
        const audience = (serviceAccount.token_uri as string | undefined) ?? PERSPECTIVE_TOKEN_URI

        const payload = {
                iss: serviceAccount.client_email,
                scope: scopes.join(' '),
                aud: audience,
                iat: issuedAt,
                exp: expiresAt
        }

        const encodedHeader = base64UrlEncode(JSON.stringify(header))
        const encodedPayload = base64UrlEncode(JSON.stringify(payload))
        const unsignedToken = `${encodedHeader}.${encodedPayload}`

        const signer = crypto.createSign('RSA-SHA256')
        signer.update(unsignedToken)
        signer.end()

        const signature = signer.sign(normalisePrivateKey(serviceAccount.private_key))
        const encodedSignature = base64UrlEncode(signature)

        return { assertion: `${unsignedToken}.${encodedSignature}`, expiresAt }
}

const getPerspectiveAccessToken = async (jobPostId: number | string | undefined) => {
        const serviceAccount = PERSPECTIVE.SERVICE_ACCOUNT
        if (!serviceAccount) {
                throw new ModerationApiError('Thiếu service account Perspective', { retryable: false })
        }

        const now = Math.floor(Date.now() / 1000)
        if (perspectiveTokenCache.token && perspectiveTokenCache.expiresAt - 60 > now) {
                logModeration('Perspective sử dụng access token cache', { jobPostId })
                return perspectiveTokenCache.token
        }

        logModeration('Perspective yêu cầu access token mới', {
                jobPostId,
                tokenUri: PERSPECTIVE_TOKEN_URI,
                scopes: PERSPECTIVE_OAUTH_SCOPES
        })

        const { assertion, expiresAt } = createServiceAccountAssertion(serviceAccount, PERSPECTIVE_OAUTH_SCOPES)

        try {
                const response = await fetch(PERSPECTIVE_TOKEN_URI, {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                                assertion
                        }).toString()
                })

                if (!response.ok) {
                        const errorText = await response.text()
                        let parsedBody: unknown = errorText

                        if (errorText) {
                                try {
                                        parsedBody = JSON.parse(errorText)
                                } catch {
                                        parsedBody = errorText
                                }
                        }

                        const status = response.status
                        const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
                        const retryable = RETRYABLE_STATUS.has(status)
                        const message = `Perspective token error ${status}: ${errorText || 'Unknown error'}`

                        throw new ModerationApiError(message, {
                                status,
                                retryable,
                                responseBody: parsedBody,
                                retryAfter
                        })
                }

                const data = (await response.json()) as {
                        access_token?: string
                        expires_in?: number
                }

                const accessToken = typeof data.access_token === 'string' ? data.access_token : null
                if (!accessToken) {
                        throw new ModerationApiError('Không lấy được access token từ Perspective', {
                                retryable: true,
                                responseBody: data
                        })
                }

                const tokenTtl = typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)
                        ? data.expires_in
                        : expiresAt - now

                perspectiveTokenCache.token = accessToken
                perspectiveTokenCache.expiresAt = now + Math.max(60, tokenTtl)

                logModeration('Perspective nhận access token thành công', {
                        jobPostId,
                        expiresIn: tokenTtl
                })

                return accessToken
        } catch (error) {
                if (isModerationApiError(error)) {
                        throw error
                }

                const message =
                        error instanceof Error
                                ? `Không thể lấy access token Perspective: ${error.message}`
                                : 'Không thể lấy access token Perspective do lỗi không xác định.'

                throw new ModerationApiError(message, {
                        retryable: true,
                        responseBody:
                                error instanceof Error
                                        ? { name: error.name, message: error.message }
                                        : String(error)
                })
        }
}

type JobPostModerationPayload = Prisma.JobPostGetPayload<{
        include: {
                requiredSkills: { include: { skill: true } }
                languages: true
        }
}>

type OpenAIModerationResult = {
        flagged?: boolean
        categories?: Record<string, boolean>
        category_scores?: Record<string, number>
}

type OpenAIModerationResponse = {
        id?: string
        model?: string
        results?: OpenAIModerationResult[]
}

type PerspectiveAttributeScore = {
        summaryScore?: {
                value?: number
                type?: string
        }
}

type PerspectiveModerationResponse = {
        attributeScores?: Record<string, PerspectiveAttributeScore>
        languages?: string[]
}

type ModerationDecision = {
        status: JobStatus
        score: number | null
        category: string | null
        summary: string | null
        raw?: unknown
}

type ModerationAttemptContext = {
        attemptsMade: number
        attemptsTotal: number
}

class ModerationApiError extends Error {
        status: number | undefined
        retryable: boolean
        responseBody: unknown
        retryAfter: number | null | undefined

        constructor(message: string, options?: { status?: number; retryable?: boolean; responseBody?: unknown; retryAfter?: number | null }) {
                super(message)
                this.name = 'ModerationApiError'
                this.status = options?.status
                this.retryable = options?.retryable ?? false
                this.responseBody = options?.responseBody
                this.retryAfter = options?.retryAfter ?? null
        }
}

const isModerationApiError = (error: unknown): error is ModerationApiError => error instanceof ModerationApiError

const normaliseAttemptContext = (context?: ModerationAttemptContext): ModerationAttemptContext => ({
        attemptsMade: Math.max(0, context?.attemptsMade ?? 0),
        attemptsTotal: Math.max(1, context?.attemptsTotal ?? 1)
})

const hasRemainingAttempts = (context: ModerationAttemptContext) =>
        context.attemptsMade + 1 < context.attemptsTotal

const serialiseModerationError = (error: unknown) => {
        if (isModerationApiError(error)) {
                return {
                        type: 'ModerationApiError',
                        message: error.message,
                        status: error.status ?? null,
                        retryable: error.retryable,
                        retryAfter: error.retryAfter ?? null,
                        response: error.responseBody ?? null
                }
        }

        if (error instanceof Error) {
                return {
                        type: error.name || 'Error',
                        message: error.message,
                        stack: error.stack ?? null
                }
        }

        return { error: String(error) }
}

const composeModerationInput = (job: JobPostModerationPayload) => {
        const sections: string[] = []
        sections.push(`Tiêu đề:\n${job.title}`)
        sections.push(`Mô tả:\n${job.description}`)

        if (job.requiredSkills.length > 0) {
                const skills = job.requiredSkills
                        .map(relation => relation.skill?.name)
                        .filter((name): name is string => Boolean(name))
                if (skills.length > 0) {
                        sections.push(`Kỹ năng yêu cầu: ${skills.join(', ')}`)
                }
        }

        if (job.customTerms && typeof job.customTerms === 'object') {
                try {
                        sections.push(`Điều khoản bổ sung: ${JSON.stringify(job.customTerms)}`)
                } catch {
                        // ignore JSON stringify errors
                }
        }

        if (job.languages.length > 0) {
                const languages = job.languages
                        .map(language => `${language.languageCode}:${language.proficiency}`)
                        .join(', ')
                sections.push(`Ngôn ngữ: ${languages}`)
        }

        const combined = sections.join('\n\n')
        return truncateInput(combined, JOB_MODERATION.MAX_INPUT_CHARS)
}

const determineDecision = (result: OpenAIModerationResult): ModerationDecision => {
        const scores = result.category_scores ?? {}
        let maxScore = 0
        let maxCategory: string | null = null

        for (const [category, rawScore] of Object.entries(scores)) {
                const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0
                if (score >= maxScore) {
                        maxScore = score
                        maxCategory = category
                }
        }

        const rejectThreshold = Math.max(JOB_MODERATION.REJECT_THRESHOLD, JOB_MODERATION.PAUSE_THRESHOLD)
        const pauseThreshold = Math.min(JOB_MODERATION.PAUSE_THRESHOLD, rejectThreshold)

        let status: JobStatus = JobStatus.PUBLISHED
        if (maxScore >= rejectThreshold) {
                        status = JobStatus.REJECTED
        } else if (maxScore >= pauseThreshold) {
                        status = JobStatus.PAUSED
        }

        const summaryMessage =
                status === JobStatus.PUBLISHED
                        ? `Tự động duyệt (điểm cao nhất ${formatCategoryLabel(maxCategory)} = ${formatScore(maxScore)})`
                        : status === JobStatus.PAUSED
                        ? `Tạm dừng để kiểm tra thêm (${formatCategoryLabel(maxCategory)} = ${formatScore(maxScore)})`
                        : `Từ chối tự động (${formatCategoryLabel(maxCategory)} = ${formatScore(maxScore)})`

        return {
                status,
                score: Number.isFinite(maxScore) ? maxScore : null,
                category: maxCategory,
                summary: summaryMessage,
                raw: result
        }
}

const applyDecision = async (job: JobPostModerationPayload, decision: ModerationDecision) => {
        const now = new Date()
        const updateData: Prisma.JobPostUncheckedUpdateInput = {
                moderationScore: decision.score ?? null,
                moderationCategory: decision.category ?? null,
                moderationSummary: decision.summary ?? null,
                moderationCheckedAt: now,
                moderationPayload: decision.raw
                        ? (decision.raw as Prisma.InputJsonValue)
                        : Prisma.JsonNull
        }

        const canChangeStatus = job.status !== JobStatus.CLOSED && job.status !== JobStatus.DRAFT

        if (canChangeStatus) {
                updateData.status = decision.status

                if (decision.status === JobStatus.PUBLISHED) {
                        updateData.publishedAt = job.publishedAt ?? now
                        updateData.closedAt = null
                } else if (decision.status === JobStatus.CLOSED) {
                        updateData.closedAt = now
                } else {
                        updateData.closedAt = null
                }
        }

        await prismaClient.jobPost.update({
                where: { id: job.id },
                data: updateData
        })

        logModeration(
                `Đã cập nhật job ${job.id} với trạng thái ${decision.status}, ` +
                        `điểm=${decision.score ?? 'null'}, category=${decision.category ?? 'null'}`
        )
}

const fetchJobForModeration = async (jobPostId: string) => {
        logModeration('Đang tải job để kiểm duyệt', { jobPostId })
        return prismaClient.jobPost.findUnique({
                where: { id: jobPostId },
                include: {
                        requiredSkills: { include: { skill: true } },
                        languages: true
                }
        })
}

const buildFailureDecision = (
        job: JobPostModerationPayload,
        message: string,
        raw?: unknown
): ModerationDecision => ({
        status:
                job.status === JobStatus.PUBLISHED_PENDING_REVIEW || job.status === JobStatus.PUBLISHED
                        ? JobStatus.PAUSED
                        : job.status,
        score: null,
        category: 'system',
        summary: message,
        raw: raw ?? { error: message }
})

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

const parseRetryAfter = (header: string | null): number | null => {
        if (!header) return null
        const parsed = Number(header)
        if (Number.isFinite(parsed) && parsed >= 0) {
                return parsed
        }
        return null
}

const canonicalisePerspectiveAttributeName = (attribute: string) => {
        const trimmed = attribute.trim()
        if (!trimmed) return ''

        const upper = trimmed.toUpperCase().replace(/\s+/g, '_')

        switch (upper) {
                case 'SEXUAL_EXPLICIT':
                        return 'SEXUALLY_EXPLICIT'
                default:
                        return upper
        }
}

const buildPerspectiveRequestedAttributes = (attributes: readonly string[]) => {
        const requested: Record<string, Record<string, never>> = {}
        for (const attribute of attributes) {
                const canonical = canonicalisePerspectiveAttributeName(attribute)
                if (!canonical) {
                        logModeration('Bỏ qua attribute Perspective không hợp lệ', { attribute })
                        continue
                }
                requested[canonical] = {}
        }
        return requested
}

const extractPerspectiveLanguageAttributeError = (responseBody: unknown) => {
        if (!responseBody || typeof responseBody !== 'object') return null

        const error = (responseBody as { error?: unknown }).error
        if (!error || typeof error !== 'object') return null

        const details = (error as { details?: unknown }).details
        if (!Array.isArray(details)) return null

        for (const detail of details) {
                if (!detail || typeof detail !== 'object') continue

                const errorType = (detail as { errorType?: unknown }).errorType
                if (errorType !== 'LANGUAGE_NOT_SUPPORTED_BY_ATTRIBUTE') continue

                const payload = (detail as { languageNotSupportedByAttributeError?: unknown })
                        .languageNotSupportedByAttributeError
                if (!payload || typeof payload !== 'object') continue

                const attribute = (payload as { attribute?: unknown }).attribute
                const languagesRaw = (payload as { requestedLanguages?: unknown }).requestedLanguages

                const languages = Array.isArray(languagesRaw)
                        ? languagesRaw.filter((lang): lang is string => typeof lang === 'string' && lang.length > 0)
                        : []

                if (typeof attribute === 'string' && attribute.trim()) {
                        return { attribute: canonicalisePerspectiveAttributeName(attribute), languages }
                }
        }

        return null
}

const callOpenAIModeration = async (payload: string): Promise<OpenAIModerationResponse> => {
        const headers: Record<string, string> = {
                Authorization: `Bearer ${OPENAI.API_KEY}`,
                'Content-Type': 'application/json'
        }

        if (OPENAI.ORGANIZATION) {
                headers['OpenAI-Organization'] = OPENAI.ORGANIZATION
        }

        if (OPENAI.PROJECT) {
                headers['OpenAI-Project'] = OPENAI.PROJECT
        }

        try {
                const response = await fetch(MODERATION_ENDPOINT, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                                model: JOB_MODERATION.MODEL,
                                input: payload
                        })
                })

                if (!response.ok) {
                        const errorText = await response.text()
                        let parsedBody: unknown = errorText
                        let serviceMessage: string | undefined

                        if (errorText) {
                                try {
                                        parsedBody = JSON.parse(errorText)
                                        const maybeError = (parsedBody as { error?: { message?: string } }).error
                                        if (maybeError && typeof maybeError === 'object' && 'message' in maybeError) {
                                                const rawMessage = (maybeError as { message?: unknown }).message
                                                if (typeof rawMessage === 'string') {
                                                        serviceMessage = rawMessage
                                                }
                                        }
                                } catch {
                                        // giữ nguyên errorText nếu không phải JSON
                                        parsedBody = errorText
                                }
                        }

                        const status = response.status
                        const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
                        const retryable = RETRYABLE_STATUS.has(status)
                        const message = `OpenAI moderation error ${status}: ${serviceMessage ?? errorText ?? 'Unknown error'}`

                        throw new ModerationApiError(message, {
                                status,
                                retryable,
                                responseBody: parsedBody,
                                retryAfter
                        })
                }

                return (await response.json()) as OpenAIModerationResponse
        } catch (error) {
                if (isModerationApiError(error)) {
                        throw error
                }

                const message =
                        error instanceof Error
                                ? `Không thể kết nối tới OpenAI moderation: ${error.message}`
                                : 'Không thể kết nối tới OpenAI moderation do lỗi không xác định.'

                throw new ModerationApiError(message, {
                        retryable: true,
                        responseBody:
                                error instanceof Error
                                        ? { name: error.name, message: error.message }
                                        : String(error)
                })
        }
}

const callPerspectiveModeration = async (
        payload: string,
        jobPostId: number | string | undefined
): Promise<PerspectiveModerationResponse> => {
        const originalAttributes = PERSPECTIVE.ATTRIBUTES.map(canonicalisePerspectiveAttributeName).filter(
                (attribute): attribute is string => attribute.length > 0
        )
        let activeAttributes = [...originalAttributes]

        const performRequest = async (attributes: string[]) => {
                const url = new URL(PERSPECTIVE_ENDPOINT)
                if (PERSPECTIVE.API_KEY) {
                        url.searchParams.set('key', PERSPECTIVE.API_KEY)
                }

                const headers: Record<string, string> = {
                        'Content-Type': 'application/json'
                }

                if (!PERSPECTIVE.API_KEY && PERSPECTIVE.SERVICE_ACCOUNT) {
                        const accessToken = await getPerspectiveAccessToken(jobPostId)
                        headers.Authorization = `Bearer ${accessToken}`
                }

                const response = await fetch(url.toString(), {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                                comment: { text: payload },
                                languages: PERSPECTIVE.LANGUAGES,
                                requestedAttributes: buildPerspectiveRequestedAttributes(attributes)
                        })
                })

                if (!response.ok) {
                        const errorText = await response.text()
                        let parsedBody: unknown = errorText

                        if (errorText) {
                                try {
                                        parsedBody = JSON.parse(errorText)
                                } catch {
                                        parsedBody = errorText
                                }
                        }

                        const status = response.status
                        const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
                        const retryable = RETRYABLE_STATUS.has(status)
                        const message = `Perspective moderation error ${status}: ${errorText || 'Unknown error'}`

                        throw new ModerationApiError(message, {
                                status,
                                retryable,
                                responseBody: parsedBody,
                                retryAfter
                        })
                }

                return (await response.json()) as PerspectiveModerationResponse
        }

        while (activeAttributes.length > 0) {
                try {
                        return await performRequest(activeAttributes)
                } catch (error) {
                        if (!isModerationApiError(error)) {
                                const message =
                                        error instanceof Error
                                                ? `Không thể kết nối tới Perspective API: ${error.message}`
                                                : 'Không thể kết nối tới Perspective API do lỗi không xác định.'

                                throw new ModerationApiError(message, {
                                        retryable: true,
                                        responseBody:
                                                error instanceof Error
                                                        ? { name: error.name, message: error.message }
                                                        : String(error)
                                })
                        }

                        const languageError =
                                error.status === 400
                                        ? extractPerspectiveLanguageAttributeError(error.responseBody)
                                        : null

                        if (languageError) {
                                const rejectedAttribute = activeAttributes.find(
                                        attribute =>
                                                canonicalisePerspectiveAttributeName(attribute) ===
                                                languageError.attribute
                                )

                                if (rejectedAttribute) {
                                        activeAttributes = activeAttributes.filter(
                                                attribute =>
                                                        canonicalisePerspectiveAttributeName(attribute) !==
                                                        languageError.attribute
                                        )

                                        logModeration('Perspective loại bỏ thuộc tính không hỗ trợ ngôn ngữ', {
                                                jobPostId,
                                                attribute: rejectedAttribute,
                                                languages: languageError.languages,
                                                remainingAttributes: activeAttributes
                                        })

                                        continue
                                }
                        }

                        throw error
                }
        }

        logModeration('Perspective không còn thuộc tính tương thích với ngôn ngữ yêu cầu', {
                jobPostId,
                languages: PERSPECTIVE.LANGUAGES,
                attemptedAttributes: originalAttributes
        })

        throw new ModerationApiError(
                'Không có thuộc tính Google Perspective nào tương thích với các ngôn ngữ đã chọn.',
                {
                        retryable: false,
                        responseBody: {
                                reason: 'no-compatible-attributes',
                                languages: PERSPECTIVE.LANGUAGES,
                                attemptedAttributes: originalAttributes
                        }
                }
        )
}

const normalisePerspectiveResult = (
        response: PerspectiveModerationResponse
): OpenAIModerationResult | null => {
        const attributeScores = response.attributeScores ?? {}
        const categoryScores: Record<string, number> = {}

        for (const [attribute, score] of Object.entries(attributeScores)) {
                const rawScore = score?.summaryScore?.value
                if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
                        categoryScores[attribute.toLowerCase()] = rawScore
                }
        }

        const hasScores = Object.keys(categoryScores).length > 0
        if (!hasScores) {
                return null
        }

        const flagged = Object.values(categoryScores).some(value => value >= JOB_MODERATION.PAUSE_THRESHOLD)

        return {
                flagged,
                categories: {},
                category_scores: categoryScores
        }
}

export const moderateJobPost = async (
        { jobPostId }: JobModerationQueuePayload,
        context?: ModerationAttemptContext
) => {
        const attemptContext = normaliseAttemptContext(context)
        const job = await fetchJobForModeration(jobPostId)
        if (!job) {
                logModeration('Không tìm thấy job để kiểm duyệt', { jobPostId })
                return
        }

        logModeration('Bắt đầu kiểm duyệt job', {
                jobPostId,
                status: job.status,
                attempt: attemptContext.attemptsMade + 1,
                attemptsTotal: attemptContext.attemptsTotal
        })

        if (!JOB_MODERATION.ENABLED) {
                logModeration('Moderation đang tắt, tự động duyệt job', { jobPostId })
                await applyDecision(job, {
                        status: JobStatus.PUBLISHED,
                        score: null,
                        category: 'system',
                        summary: 'Hệ thống moderation đang tắt - tự động duyệt.',
                        raw: { disabled: true }
                })
                return
        }

        const provider = JOB_MODERATION.PROVIDER
        const configuredProvider = JOB_MODERATION.CONFIGURED_PROVIDER

        logModeration('Sử dụng nhà cung cấp moderation', {
                jobPostId,
                provider,
                configuredProvider,
                autoSelected: provider !== configuredProvider
        })

        const providerLabel = provider === 'perspective' ? 'Google Perspective API' : 'OpenAI Moderation'

        if (provider === 'openai' && !OPENAI.API_KEY) {
                logModeration('Thiếu OPENAI_API_KEY, không thể gọi moderation', { jobPostId })
                await applyDecision(
                        job,
                        buildFailureDecision(
                                job,
                                'Thiếu OPENAI_API_KEY, job bị tạm dừng để kiểm tra thủ công.'
                        )
                )
                return
        }

        if (provider === 'perspective') {
                const hasApiKey = Boolean(PERSPECTIVE.API_KEY)
                const hasServiceAccount = Boolean(PERSPECTIVE.SERVICE_ACCOUNT)

                logModeration('Perspective phương thức xác thực', {
                        jobPostId,
                        method: hasApiKey ? 'api-key' : hasServiceAccount ? 'service-account' : 'none'
                })

                if (!hasApiKey && !hasServiceAccount) {
                        logModeration('Thiếu thông tin xác thực Perspective, không thể gọi moderation', {
                                jobPostId
                        })
                        await applyDecision(
                                job,
                                buildFailureDecision(
                                        job,
                                        'Thiếu thông tin xác thực Google Perspective (API key hoặc service account). Job bị tạm dừng để kiểm tra thủ công.'
                                )
                        )
                        return
                }
        }

        const moderationInput = composeModerationInput(job)

        logModeration('Payload moderation được tạo', {
                jobPostId,
                length: moderationInput.length
        })

        if (!moderationInput.trim()) {
                logModeration('Nội dung trống, tự động duyệt job', { jobPostId })
                await applyDecision(job, {
                        status: JobStatus.PUBLISHED,
                        score: 0,
                        category: null,
                        summary: 'Nội dung rỗng - tự động duyệt.',
                        raw: { skipped: 'empty-content' }
                })
                return
        }

        try {
                let normalisedResult: OpenAIModerationResult | null = null
                let rawResponse: unknown = null

                if (provider === 'perspective') {
                        const perspectiveAttributesForLog = PERSPECTIVE.ATTRIBUTES.map(
                                canonicalisePerspectiveAttributeName
                        ).filter((attribute): attribute is string => attribute.length > 0)

                        logModeration('Gọi Google Perspective moderation', {
                                jobPostId,
                                attributes: perspectiveAttributesForLog,
                                languages: PERSPECTIVE.LANGUAGES
                        })
                        const response = await callPerspectiveModeration(moderationInput, jobPostId)
                        rawResponse = response
                        normalisedResult = normalisePerspectiveResult(response)

                        if (!normalisedResult) {
                                logModeration('Phản hồi Perspective không có điểm số', { jobPostId, response })
                                await applyDecision(
                                        job,
                                        buildFailureDecision(
                                                job,
                                                'Perspective API không trả về điểm số. Job cần kiểm duyệt thủ công.'
                                        )
                                )
                                return
                        }
                } else {
                        logModeration('Gọi OpenAI moderation', { jobPostId, model: JOB_MODERATION.MODEL })
                        const response = await callOpenAIModeration(moderationInput)
                        rawResponse = response
                        normalisedResult = response.results?.[0] ?? null

                        if (!normalisedResult) {
                                logModeration('Phản hồi moderation không hợp lệ', { jobPostId, response })
                                await applyDecision(job, buildFailureDecision(job, 'Không nhận được dữ liệu moderation hợp lệ.'))
                                return
                        }
                }

                logModeration('Nhận kết quả moderation', {
                        jobPostId,
                        provider,
                        flagged: normalisedResult.flagged,
                        category_scores: normalisedResult.category_scores
                })

                const decision = determineDecision(normalisedResult)
                decision.raw = {
                        provider,
                        response: rawResponse,
                        result: normalisedResult
                }
                logModeration('Quyết định moderation', { jobPostId, decision })
                await applyDecision(job, decision)
        } catch (error) {
                if (isModerationApiError(error) && error.retryable && hasRemainingAttempts(attemptContext)) {
                        logModeration('Lỗi tạm thời khi gọi dịch vụ moderation, sẽ retry', {
                                jobPostId,
                                status: error.status ?? null,
                                attempt: attemptContext.attemptsMade + 1,
                                attemptsTotal: attemptContext.attemptsTotal,
                                retryAfterSeconds: error.retryAfter ?? undefined
                        })
                        throw error
                }

                const fallbackSummary = isModerationApiError(error)
                        ? error.status === 429
                                ? `${providerLabel} đang giới hạn tốc độ, job được tạm dừng để chờ kiểm tra thủ công.`
                                : `Gọi ${providerLabel} thất bại (mã ${error.status ?? 'không xác định'}). Job cần kiểm duyệt thủ công.`
                        : `Gọi ${providerLabel} thất bại, job được tạm dừng để kiểm tra thủ công.`

                logModerationError('Lỗi gọi dịch vụ moderation', {
                        jobPostId,
                        provider,
                        attempt: attemptContext.attemptsMade + 1,
                        attemptsTotal: attemptContext.attemptsTotal,
                        error
                })

                await applyDecision(
                        job,
                        buildFailureDecision(job, fallbackSummary, serialiseModerationError(error))
                )
        }
}

export const requestJobPostModeration = async (
        payload: JobModerationQueuePayload,
        trigger: JobModerationTrigger = 'UPDATE'
) => {
        const data: JobModerationQueuePayload = {
                jobPostId: payload.jobPostId,
                trigger: payload.trigger ?? trigger
        }

        if (!JOB_MODERATION.ENABLED) {
                logModeration('Moderation queue bị bỏ qua vì đang tắt, chạy trực tiếp', data)
                await moderateJobPost(data, { attemptsMade: 0, attemptsTotal: 1 })
                return
        }

        try {
                logModeration('Thêm job vào queue moderation', data)
                const job = await jobModerationQueue.add('moderate-job-post', data, {
                        jobId: `${data.jobPostId}:${Date.now()}`
                })
                logModeration('Đã enqueue job moderation thành công', {
                        bullJobId: job.id,
                        jobPostId: data.jobPostId,
                        trigger: data.trigger
                })
        } catch (error) {
                logModerationError('Không thể enqueue job moderation', { error })
                logModeration('Enqueue thất bại, fallback sang xử lý đồng bộ', data)
                await moderateJobPost(data, { attemptsMade: 0, attemptsTotal: 1 })
        }
}

export default {
        requestModeration: requestJobPostModeration,
        moderateJobPost
}
