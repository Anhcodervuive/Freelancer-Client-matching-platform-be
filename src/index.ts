import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'

import { PORT } from './config/environment'
import { prismaClient } from './config/prisma-client'

import rootRouter from './routes'
import { errorMiddleware } from './middlewares/errors'
import { redisClient } from './config/redis-client'
import { corsOptions } from './config/cors'
import '~/config/passport'
import { registerRealtime } from './realtime'

async function START_SERVIER() {
	try {
		await prismaClient.$connect()
		await redisClient.on('connect', () => console.log('Connected to Redis'))
		console.log('✅ Connected to Mysql!')

		const app = express()
		app.disable('etag') // bỏ ETag để tránh re-use
		app.use((req, res, next) => {
			res.set('Cache-Control', 'no-store') // hoặc 'no-cache, no-store, must-revalidate'
			res.set('Pragma', 'no-cache')
			res.set('Expires', '0')
			next()
		})

		app.use(express.json())
		app.use(cookieParser())
		app.use(cors(corsOptions))

		app.use(morgan('combined'))

		app.use('/api', rootRouter)

                app.use(errorMiddleware)

                const httpServer = createServer(app)
                registerRealtime(httpServer)

                httpServer.listen(PORT, () => {
                        console.log(`Server is running on http://localhost:${PORT}`)
                })

                // 3. Graceful shutdown khi stop app
                process.on('SIGINT', async () => {
                        await prismaClient.$disconnect()
                        redisClient.disconnect()
                        httpServer.close(() => {
                                process.exit(0)
                        })
                })
                process.on('SIGTERM', async () => {
                        await prismaClient.$disconnect()
                        redisClient.disconnect()
                        httpServer.close(() => {
                                process.exit(0)
                        })
                })
	} catch (error) {
		// Nếu connect lỗi, báo lỗi và dừng app
		console.error('❌ Failed to connect database:', error)
		process.exit(1)
	}
}

START_SERVIER()
