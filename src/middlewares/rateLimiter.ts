// src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit'
export const uploadLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 phút
	max: 30, // 30 yêu cầu/phút cho endpoint ký
	standardHeaders: true,
	legacyHeaders: false
})
