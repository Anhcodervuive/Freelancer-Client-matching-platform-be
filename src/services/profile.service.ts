import { prismaClient } from '~/config/prisma-client'
import assetService from './asset.service'
const getOrCreateMyProfile = async (userId: string) => {
	const found = await prismaClient.profile.findUnique({ where: { userId } })
	if (found) return found
	return prismaClient.profile.create({ data: { userId } })
}

const updateMyProfile = async (userId: string, input: any) => {
	// Nếu không gửi displayName, auto từ firstName + lastName (nếu có)
	let displayName = input.displayName
	if (!displayName && (input.firstName || input.lastName)) {
		displayName = `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || undefined
	}

	await prismaClient.profile.upsert({
		where: { userId },
		create: { userId, ...input },
		update: { ...input }
	})

	const updatedUser = await prismaClient.user.findFirst({
		where: {
			id: userId
		},
		include: {
			profile: true
		}
	})

	const avatarUrl = await assetService.getProfileAvatarUrl(userId)

	const publicUser = {
		id: updatedUser?.id,
		email: updatedUser?.email,
		role: updatedUser?.role,
		...updatedUser?.profile,
		avatar: avatarUrl
	}

	return publicUser
}

const replaceProfileAvatar = (userId: string, input: any) => {}

export default {
	getOrCreateMyProfile,
	updateMyProfile,
	replaceProfileAvatar
}
