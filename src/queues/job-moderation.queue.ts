import { Queue } from 'bullmq'

import { JOB_MODERATION } from '~/config/environment'
import { JobModerationQueuePayload } from '~/schema/job-moderation.schema'

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
