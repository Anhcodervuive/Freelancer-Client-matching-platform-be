import { prismaClient } from '~/config/prisma-client'
import { Prisma } from '@prisma/client'
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

	return prismaClient.profile.upsert({
		where: { userId },
		create: { userId, ...input },
		update: { ...input }
	})
}

export default {
	getOrCreateMyProfile,
	updateMyProfile
}
