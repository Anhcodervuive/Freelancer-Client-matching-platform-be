import { Queue } from 'bullmq'

import { connection } from './redis'

export const matchInteractionQueue = new Queue('match-interaction', {
        connection,
        defaultJobOptions: {
                removeOnComplete: true
        }
})
