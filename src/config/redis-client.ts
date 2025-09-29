import Redis, { type RedisOptions } from 'ioredis'

import { REDIS_CONFIG } from './environment'

const buildRedisOptions = (): RedisOptions => ({
	host: REDIS_CONFIG.HOST,
	port: REDIS_CONFIG.PORT,
	password: REDIS_CONFIG.PASSWORD || '',
	lazyConnect: false,
	enableReadyCheck: true,
	maxRetriesPerRequest: 3
})

export const createRedisClient = () => new Redis(buildRedisOptions())

export const redisClient = createRedisClient()
