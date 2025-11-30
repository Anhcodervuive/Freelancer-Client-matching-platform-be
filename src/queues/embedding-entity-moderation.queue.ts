import { Queue } from 'bullmq'
import { connection } from './redis'

export const embeddingEntityQueue = new Queue('embedding-entity', {
	connection,
	defaultJobOptions: {
		removeOnComplete: true
	}
})
