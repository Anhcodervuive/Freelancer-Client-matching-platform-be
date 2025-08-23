import crypto from 'crypto'
import { redisClient } from '~/config/redis-client'

export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Đưa refresh token vào blacklist
 * @param token refresh token cần blacklist
 * @param expiresInSeconds thời gian token còn hiệu lực (tính bằng giây)
 * @param userId (tuỳ chọn) id user
 */
export async function blacklistRefreshToken(token: string, expiresInSeconds: number, userId?: string): Promise<void> {
	const tokenHash = hashToken(token)
	const key = `blacklist:refresh_token:${tokenHash}`
	await redisClient.set(key, userId || 'revoked', 'EX', expiresInSeconds)
}

/**
 * Kiểm tra token có bị blacklist không
 * @param token refresh token cần kiểm tra
 * @returns true nếu token đã bị blacklist
 */
export async function isRefreshTokenBlacklisted(token: string): Promise<boolean> {
	const tokenHash = hashToken(token)
	const key = `blacklist:refresh_token:${tokenHash}`
	const exists = await redisClient.exists(key)
	return exists === 1
}
