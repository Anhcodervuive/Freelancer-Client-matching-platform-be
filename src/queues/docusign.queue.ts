import { Queue, QueueEvents } from 'bullmq'

import { DOCUSIGN } from '~/config/environment'
import type { Role } from '~/generated/prisma'
import type { TriggerDocuSignEnvelopeInput } from '~/schema/contract.schema'

import { connection } from './redis'

export type DocuSignEnvelopeJobData = {
        contractId: string
        actor: { id: string; role: Role | null } | null
        payload?: TriggerDocuSignEnvelopeInput
        options?: { skipAuthorization?: boolean }
}

export const docusignEnvelopeQueue = new Queue<DocuSignEnvelopeJobData>('docusign-envelope', {
        connection,
        defaultJobOptions: {
                        removeOnComplete: true,
                removeOnFail: false,
                attempts: DOCUSIGN.QUEUE.RETRY_ATTEMPTS,
                backoff: {
                        type: 'fixed',
                        delay: DOCUSIGN.QUEUE.RETRY_DELAY_MS
                }
        }
})

const queueEvents = new QueueEvents('docusign-envelope', { connection })

queueEvents.on('waiting', ({ jobId }) => {
        console.info('DocuSign queue đang chờ xử lý', { jobId })
})

queueEvents.on('active', ({ jobId }) => {
        console.info('DocuSign queue bắt đầu xử lý job', { jobId })
})

queueEvents.on('completed', ({ jobId, returnvalue }) => {
        console.info('DocuSign queue đã hoàn tất job', { jobId, returnvalue })
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error('DocuSign queue thất bại', { jobId, failedReason })
})

queueEvents.on('stalled', ({ jobId }) => {
        console.warn('DocuSign queue bị treo', { jobId })
})

queueEvents.on('error', error => {
        console.error('DocuSign queue gặp lỗi', error)
})

void queueEvents
        .waitUntilReady()
        .then(() => console.info('DocuSign queue events đã sẵn sàng lắng nghe'))
        .catch(error => console.error('Không thể khởi tạo queue events DocuSign', error))
