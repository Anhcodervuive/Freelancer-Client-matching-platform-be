import express from 'express'
import morgan from 'morgan'

import { PORT } from './config/environment'
import { prismaClient } from './config/prisma-client'

import rootRouter from './routes'
import { errorMiddleware } from './middlewares/errors'

async function START_SERVIER() {
	try {
		await prismaClient.$connect()
		console.log('✅ Connected to Mysql!')

		const app = express()

		app.use(express.json())

		app.use(morgan('combined'))

		app.use('/api', rootRouter)

		app.use(errorMiddleware)

		app.listen(PORT, () => {
			console.log(`Server is running on http://localhost:${PORT}`)
		})

		// 3. Graceful shutdown khi stop app
		process.on('SIGINT', async () => {
			await prismaClient.$disconnect()
			process.exit(0)
		})
		process.on('SIGTERM', async () => {
			await prismaClient.$disconnect()
			process.exit(0)
		})
	} catch (error) {
		// Nếu connect lỗi, báo lỗi và dừng app
		console.error('❌ Failed to connect database:', error)
		process.exit(1)
	}
}

START_SERVIER()
