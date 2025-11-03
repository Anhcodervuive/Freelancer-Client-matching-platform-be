import { Worker } from 'bullmq'

import { connection } from './redis'
import { JOB_MODERATION } from '~/config/environment'
import { JobModerationQueuePayloadSchema } from '~/schema/job-moderation.schema'
import { moderateJobPost } from '~/services/moderation/job-post-moderation.service'
import { logModeration, logModerationError } from '~/services/moderation/job-moderation.logger'

const worker = new Worker(
        'job-moderation',
        async job => {
                const payload = JobModerationQueuePayloadSchema.parse(job.data ?? {})
                const attemptsTotal = job.opts.attempts ?? JOB_MODERATION.RETRY_ATTEMPTS
                logModeration('Worker bắt đầu xử lý job moderation', {
                        bullJobId: job.id,
                        jobPostId: payload.jobPostId,
                        trigger: payload.trigger,
                        attempt: job.attemptsMade + 1,
                        attemptsTotal
                })
                await moderateJobPost(payload, {
                        attemptsMade: job.attemptsMade,
                        attemptsTotal
                })
                logModeration('Worker đã hoàn tất xử lý job moderation', {
                        bullJobId: job.id,
                        jobPostId: payload.jobPostId
                })
        },
        { connection, concurrency: JOB_MODERATION.WORKER_CONCURRENCY }
)

worker.on('failed', (job, error) => {
        logModerationError('Worker job moderation thất bại', {
                bullJobId: job?.id,
                jobPostId: job?.data?.jobPostId,
                error: error?.message ?? error
        })
})

worker.on('error', error => {
        logModerationError('Worker gặp lỗi không mong muốn', { error })
})

console.log('Job moderation worker started...')
