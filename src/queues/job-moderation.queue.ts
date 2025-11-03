import { Queue, QueueEvents } from 'bullmq'

import { JOB_MODERATION } from '~/config/environment'
import { JobModerationQueuePayload } from '~/schema/job-moderation.schema'
import { logModeration, logModerationError } from '~/services/moderation/job-moderation.logger'

import { connection } from './redis'

export const jobModerationQueue = new Queue<JobModerationQueuePayload>('job-moderation', {
        connection,
        defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: false,
                attempts: JOB_MODERATION.RETRY_ATTEMPTS,
                backoff: {
                        type: 'exponential',
                        delay: JOB_MODERATION.RETRY_DELAY_MS
                }
        }
})

const queueEvents = new QueueEvents('job-moderation', { connection })

queueEvents.on('waiting', ({ jobId }) => {
        logModeration('Job moderation đang chờ xử lý trong queue', { jobId })
})

queueEvents.on('active', ({ jobId }) => {
        logModeration('Worker đã nhận job moderation từ queue', { jobId })
})

queueEvents.on('completed', ({ jobId, returnvalue }) => {
        logModeration('Job moderation đã hoàn tất trong queue', { jobId, returnvalue })
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
        logModerationError('Job moderation thất bại trong queue', { jobId, failedReason })
})

queueEvents.on('stalled', ({ jobId }) => {
        logModerationError('Job moderation bị treo trong queue', { jobId })
})

queueEvents.on('error', error => {
        logModerationError('QueueEvents gặp lỗi', { error })
})

void queueEvents
        .waitUntilReady()
        .then(() => {
                logModeration('QueueEvents cho job moderation đã sẵn sàng lắng nghe sự kiện')
        })
        .catch(error => {
                logModerationError('Không thể khởi tạo QueueEvents cho job moderation', { error })
        })
