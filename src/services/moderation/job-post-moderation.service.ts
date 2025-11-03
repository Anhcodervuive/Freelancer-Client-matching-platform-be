import { JobStatus, Prisma } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { JOB_MODERATION, OPENAI } from '~/config/environment'
import { jobModerationQueue } from '~/queues/job-moderation.queue'
import type { JobModerationQueuePayload, JobModerationTrigger } from '~/schema/job-moderation.schema'

const MODERATION_ENDPOINT = 'https://api.openai.com/v1/moderations'

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

type ModerationDecision = {
        status: JobStatus
        score: number | null
        category: string | null
        summary: string | null
        raw?: unknown
}

const logModeration = (...messages: unknown[]) => {
        if (!JOB_MODERATION.LOG_VERBOSE) return
        console.log('[JobModeration]', ...messages)
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

const buildFailureDecision = (job: JobPostModerationPayload, message: string): ModerationDecision => ({
        status:
                job.status === JobStatus.PUBLISHED_PENDING_REVIEW || job.status === JobStatus.PUBLISHED
                        ? JobStatus.PAUSED
                        : job.status,
        score: null,
        category: 'system',
        summary: message,
        raw: { error: message }
})

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
                throw new Error(`OpenAI moderation error ${response.status}: ${errorText}`)
        }

        return (await response.json()) as OpenAIModerationResponse
}

export const moderateJobPost = async ({ jobPostId }: JobModerationQueuePayload) => {
        const job = await fetchJobForModeration(jobPostId)
        if (!job) {
                logModeration('Không tìm thấy job để kiểm duyệt', { jobPostId })
                return
        }

        logModeration('Bắt đầu kiểm duyệt job', { jobPostId, status: job.status })

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

        if (!OPENAI.API_KEY) {
                logModeration('Thiếu OPENAI_API_KEY, không thể gọi moderation', { jobPostId })
                await applyDecision(job, buildFailureDecision(job, 'Thiếu OPENAI_API_KEY, job bị tạm dừng để kiểm tra thủ công.'))
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
                logModeration('Gọi OpenAI moderation', { jobPostId, model: JOB_MODERATION.MODEL })
                const response = await callOpenAIModeration(moderationInput)
                const result = response.results?.[0]

                if (!result) {
                        logModeration('Phản hồi moderation không hợp lệ', { jobPostId, response })
                        await applyDecision(job, buildFailureDecision(job, 'Không nhận được dữ liệu moderation hợp lệ.'))
                        return
                }

                logModeration('Nhận kết quả moderation', {
                        jobPostId,
                        flagged: result.flagged,
                        category_scores: result.category_scores
                })

                const decision = determineDecision(result)
                logModeration('Quyết định moderation', { jobPostId, decision })
                await applyDecision(job, decision)
        } catch (error) {
                const message =
                        error instanceof Error ? error.message : 'Gọi OpenAI moderation thất bại không rõ lý do.'
                console.error('[JobModeration]', 'Lỗi gọi OpenAI moderation', { jobPostId, error })
                await applyDecision(job, buildFailureDecision(job, message))
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
                await moderateJobPost(data)
                return
        }

        try {
                logModeration('Thêm job vào queue moderation', data)
                await jobModerationQueue.add('moderate-job-post', data, {
                        jobId: `${data.jobPostId}:${Date.now()}`
                })
        } catch (error) {
                console.error('Không thể enqueue job moderation', error)
                logModeration('Enqueue thất bại, fallback sang xử lý đồng bộ', data)
                await moderateJobPost(data)
        }
}

export default {
        requestModeration: requestJobPostModeration,
        moderateJobPost
}
