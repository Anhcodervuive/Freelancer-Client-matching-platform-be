import { prismaClient } from '~/config/prisma-client'
import crypto from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import { cloudinarySignType, r2PresignSignType } from '~/schema/upload.schema'
import { CLOUDINARY_CONFIG_INFO, R2_CONFIG } from '~/config/environment'
import { createPresignedUploadUrl } from '~/providers/r2.provider'

const ensureUserBelongToThreadChat = async (userId: string, threadId: string) => {
	const participant = await prismaClient.chatParticipant.findFirst({
		where: {
			userId,
			threadId
		}
	})

	if (!participant) {
		throw new ForbiddenException('User is not participate this chat', ErrorCode.FORBIDDEN)
	}
}

const getCloudinarySign = async (userId: string, payload: cloudinarySignType) => {
	await ensureUserBelongToThreadChat(userId, payload.threadId)

	const timestamp = Math.floor(Date.now() / 1000)

	const folder = `${payload.folder}/${payload.threadId}`

	const params: Record<string, any> = {
		timestamp,
		folder: folder
	}

	const signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_CONFIG_INFO.API_SECRET ?? '')

	return {
		ok: true,
		cloud_name: CLOUDINARY_CONFIG_INFO.CLOUD_NAME,
		api_key: CLOUDINARY_CONFIG_INFO.API_KEY,
		timestamp,
		folder,
		resource_type: payload.resource_type,
		signature,
		// gợi ý client: upload tới https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload
		expiresIn: 300
	}
}

const getR2Sign = async (userId: string, payload: r2PresignSignType) => {
	const { filename, contentType, size, folder } = payload
	await ensureUserBelongToThreadChat(userId, payload.threadId)

	const safe = filename.replace(/[^\w.\- ]/g, '_')
	const key = `${folder}/${userId}/${Date.now()}_${crypto.randomUUID()}_${safe}`

	// URL ký sống 5 phút
	const url = await createPresignedUploadUrl(key, {
		bucket: R2_CONFIG.BUCKET!,
		contentType,
		expiresIn: 60 * 5
	})

	return {
		ok: true,
		method: 'PUT',
		bucket: R2_CONFIG.BUCKET!,
		url,
		headers: { 'Content-Type': contentType },
		key,
		publicUrl: `${R2_CONFIG.PUBLIC_BASE_URL}/${key}`,
		expiresIn: 300
	}
}

export default {
	getCloudinarySign,
	getR2Sign
}
