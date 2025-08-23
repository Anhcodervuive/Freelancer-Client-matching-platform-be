import Redis from 'ioredis'

export const redisClient = new Redis({
	host: 'localhost', // đổi thành host production nếu dùng cloud
	port: 6379 // port mặc định
	// password: 'nếu có password'
})
