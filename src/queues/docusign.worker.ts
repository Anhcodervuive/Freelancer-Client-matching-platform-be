import { Worker } from 'bullmq'

import { DOCUSIGN } from '~/config/environment'
import contractSignatureService from '~/services/contract-signature.service'

import { connection } from './redis'
import type { DocuSignEnvelopeJobData } from './docusign.queue'

if (!DOCUSIGN.QUEUE.ENABLED) {
        console.warn('DOCUSIGN_QUEUE_ENABLED đang = false, worker sẽ thoát vì hàng đợi bị tắt')
        process.exit(0)
}

const worker = new Worker<DocuSignEnvelopeJobData>(
        'docusign-envelope',
        async job => {
                const attemptsTotal = job.opts.attempts ?? DOCUSIGN.QUEUE.RETRY_ATTEMPTS
                console.info('DocuSign worker bắt đầu xử lý job', {
                        bullJobId: job.id,
                        contractId: job.data.contractId,
                        attempt: job.attemptsMade + 1,
                        attemptsTotal
                })

                await contractSignatureService.triggerDocuSignEnvelope(
                        job.data.contractId,
                        job.data.actor,
                        job.data.payload,
                        job.data.options
                )

                console.info('DocuSign worker hoàn tất job', {
                        bullJobId: job.id,
                        contractId: job.data.contractId
                })
        },
        { connection, concurrency: DOCUSIGN.QUEUE.WORKER_CONCURRENCY }
)

worker.on('failed', (job, error) => {
        console.error('DocuSign worker thất bại', {
                bullJobId: job?.id,
                contractId: job?.data?.contractId,
                error: error?.message ?? error
        })
})

worker.on('error', error => {
        console.error('DocuSign worker gặp lỗi không mong muốn', error)
})

console.log('DocuSign worker started...')
