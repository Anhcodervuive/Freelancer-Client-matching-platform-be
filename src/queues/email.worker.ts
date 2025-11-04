import { Worker } from 'bullmq'
import { connection } from './redis'
import {
        sendArbitrationDecisionEmail,
        sendDisputeNegotiationEmail,
        sendJobModerationRemovalEmail,
        sendJobModerationWarningEmail,
        sendVerifyEmail
} from '~/providers/mail.provider'

new Worker(
        'email',
        async job => {
                switch (job.name) {
                        case 'sendVerifyEmail': {
                                const { to, name, verifyLink } = job.data
                                await sendVerifyEmail(to, name, verifyLink)
                                break
                        }
                        case 'sendDisputeNegotiationEmail': {
                                const { to, recipientName, payload } = job.data
                                await sendDisputeNegotiationEmail(to, recipientName, payload)
                                break
                        }
                        case 'sendArbitrationDecisionEmail': {
                                const { to, payload } = job.data
                                await sendArbitrationDecisionEmail(to, payload)
                                break
                        }
                        case 'sendJobModerationWarningEmail': {
                                const { to, payload } = job.data
                                await sendJobModerationWarningEmail(to, payload)
                                break
                        }
                        case 'sendJobModerationRemovalEmail': {
                                const { to, payload } = job.data
                                await sendJobModerationRemovalEmail(to, payload)
                                break
                        }
                        default:
                                console.warn(`Unknown email job: ${job.name}`)
                                break
                }
        },
        { connection }
)

// Có thể log để xem worker chạy
console.log('Email worker started...')
