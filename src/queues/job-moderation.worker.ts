import { Worker } from 'bullmq'

import { connection } from './redis'
import { JobModerationQueuePayloadSchema } from '~/schema/job-moderation.schema'
import { moderateJobPost } from '~/services/moderation/job-post-moderation.service'

new Worker(
        'job-moderation',
        async job => {
                const payload = JobModerationQueuePayloadSchema.parse(job.data ?? {})
                await moderateJobPost(payload)
        },
        { connection }
)

console.log('Job moderation worker started...')
