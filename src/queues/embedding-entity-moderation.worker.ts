import { Worker } from 'bullmq'
import axios from 'axios'
import { connection } from './redis'

const ML_BASE_URL = 'http://localhost:8000'

new Worker(
	'embedding-entity',
	async e => {
		await axios.post(`${ML_BASE_URL}/api/update_embedding`, e.data)
	},
	{
		connection
	}
)

console.log('Embedding entity worker started...')
