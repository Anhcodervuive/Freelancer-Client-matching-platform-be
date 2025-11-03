import { JobStatus, Prisma } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { JOB_MODERATION, OPENAI, PERSPECTIVE } from '~/config/environment'
import { jobModerationQueue } from '~/queues/job-moderation.queue'
import type { JobModerationQueuePayload, JobModerationTrigger } from '~/schema/job-moderation.schema'
import { logModeration, logModerationError } from './job-moderation.logger'

const MODERATION_ENDPOINT = 'https://api.openai.com/v1/moderations'
const PERSPECTIVE_ENDPOINT = PERSPECTIVE.ENDPOINT

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

const buildPerspectiveRequestedAttributes = () => {
        const attributes = PERSPECTIVE.ATTRIBUTES
        const requested: Record<string, Record<string, never>> = {}
        for (const attribute of attributes) {
                requested[attribute] = {}
        }
        return requested
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

const callPerspectiveModeration = async (payload: string): Promise<PerspectiveModerationResponse> => {
        const url = new URL(PERSPECTIVE_ENDPOINT)
        if (PERSPECTIVE.API_KEY) {
                url.searchParams.set('key', PERSPECTIVE.API_KEY)
        }

        try {
                const response = await fetch(url.toString(), {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                                comment: { text: payload },
                                languages: PERSPECTIVE.LANGUAGES,
                                requestedAttributes: buildPerspectiveRequestedAttributes()
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
        } catch (error) {
                        if (isModerationApiError(error)) {
                                throw error
                        }

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
        const providerLabel = provider === 'perspective' ? 'Google Perspective API' : 'OpenAI Moderation'

        logModeration('Sử dụng nhà cung cấp moderation', { jobPostId, provider })

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

        if (provider === 'perspective' && !PERSPECTIVE.API_KEY) {
                logModeration('Thiếu PERSPECTIVE_API_KEY, không thể gọi moderation', { jobPostId })
                await applyDecision(
                        job,
                        buildFailureDecision(
                                job,
                                'Thiếu PERSPECTIVE_API_KEY, job bị tạm dừng để kiểm tra thủ công.'
                        )
                )
                return
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
                        logModeration('Gọi Google Perspective moderation', {
                                jobPostId,
                                attributes: PERSPECTIVE.ATTRIBUTES,
                                languages: PERSPECTIVE.LANGUAGES
                        })
                        const response = await callPerspectiveModeration(moderationInput)
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
