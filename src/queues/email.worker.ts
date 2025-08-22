import { Worker } from 'bullmq'
import { connection } from './redis'
import { sendVerifyEmail } from '~/providers/mail.provider'

new Worker(
	'email',
	async job => {
		const { to, name, verifyLink } = job.data
		await sendVerifyEmail(to, name, verifyLink)
	},
	{ connection }
)

// Có thể log để xem worker chạy
console.log('Email worker started...')
