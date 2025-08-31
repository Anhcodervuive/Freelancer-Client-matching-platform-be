// services/assets.service.ts

import { CLOUDINARY_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { AssetKind, AssetProvider, AssetRole } from '~/generated/prisma'
import {
	uploadBufferToCloudinary,
	destroyCloudinary,
	cloudinaryProvider
} from '~/providers/cloudinaryProvider.provider'

const mimeToKind = (m: string): AssetKind =>
	m.startsWith('image/') ? 'IMAGE' : m.startsWith('video/') ? 'VIDEO' : 'FILE'

/** Upload 1 file và thay thế avatar (PROFILE/AVATAR) */
async function replaceProfileAvatar(userId: string, file: Express.Multer.File) {
	const up = await uploadBufferToCloudinary(file.buffer, {
		folder: `${CLOUDINARY_CONFIG_INFO.PROFILE_FOLDER}/${userId}/avatar`,
		mime: file.mimetype
	})

	// Tạo asset mới
	const newAsset = await prismaClient.asset.create({
		data: {
			provider: 'CLOUDINARY',
			kind: mimeToKind(file.mimetype),
			publicId: up.public_id,
			url: up.secure_url,
			width: up.width ?? null,
			height: up.height ?? null,
			bytes: up.bytes ?? null,
			mimeType: file.mimetype
		}
	})

	// Lấy link cũ
	const old = await prismaClient.assetLink.findFirst({
		where: { ownerType: 'USER', ownerId: userId, role: 'AVATAR', position: 0 },
		include: { asset: true }
	})

	// Thay link trong 1 transaction
	await prismaClient
		.$transaction(async tx => {
			if (old) await tx.assetLink.delete({ where: { id: old.id } })
			await tx.assetLink.upsert({
				where: {
					ownerType_ownerId_role_position: {
						ownerType: 'USER',
						ownerId: userId,
						role: 'AVATAR',
						position: 0
					}
				},
				update: { assetId: newAsset.id },
				create: { ownerType: 'USER', ownerId: userId, role: 'AVATAR', position: 0, assetId: newAsset.id }
			})
			if (old) {
				const rest = await tx.assetLink.count({ where: { assetId: old.assetId } })
				if (rest === 0) await tx.asset.delete({ where: { id: old.assetId } })
			}
		})
		.catch(async e => {
			// rollback upload mới nếu DB fail
			await destroyCloudinary(up.public_id, file.mimetype)
			throw e
		})

	// Xoá file cũ ở Cloudinary (nếu orphan)
	if (old?.asset.publicId) {
		const linkCount = await prismaClient.assetLink.count({ where: { assetId: old.assetId } })
		if (linkCount === 0) await destroyCloudinary(old.asset.publicId, old.asset.mimeType ?? undefined)
	}

	return newAsset
}

async function getProfileAvatarUrl(userId: string): Promise<string | null> {
	const link = await prismaClient.assetLink.findFirst({
		where: { ownerType: 'USER', ownerId: userId, role: AssetRole.AVATAR, position: 0 },
		include: { asset: { select: { url: true, publicId: true } } }
	})
	if (!link) return null

	// Ưu tiên url đã lưu; nếu không có thì build từ publicId (Cloudinary)
	return (
		link.asset.url ??
		(link.asset.publicId
			? cloudinaryProvider.url(link.asset.publicId, {
					secure: true,
					transformation: [{ width: 128, height: 128, crop: 'thumb', gravity: 'face', quality: 'auto' }]
			  })
			: null)
	)
}

export default {
	replaceProfileAvatar,
	getProfileAvatarUrl
}
