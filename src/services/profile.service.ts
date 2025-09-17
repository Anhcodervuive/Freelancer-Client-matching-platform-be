import { prismaClient } from '~/config/prisma-client'
import assetService from './asset.service'
const getOrCreateMyProfile = async (userId: string) => {
	const found = await prismaClient.profile.findUnique({
		where: { userId },
		include: {
			freelancer: true,
			client: true
		}
	})
	if (found) return found
	return prismaClient.profile.create({ data: { userId } })
}

const updateMyProfile = async (userId: string, input: any) => {
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

const createFreelancerProfile = async (userId: string) => {
	await prismaClient.user.update({
		where: {
			id: userId
		},
		data: {
			role: 'FREELANCER'
		}
	})
	return prismaClient.freelancer.create({
		data: {
			userId
		}
	})
}

const createClientProfile = async (userId: string) => {
	await prismaClient.user.update({
		where: {
			id: userId
		},
		data: {
			role: 'CLIENT'
		}
	})
	return prismaClient.client.create({
		data: {
			userId
		}
	})
}

const deleteFreelancerProfile = async (userId: string) => {
	return prismaClient.freelancer.create({
		data: {
			userId
		}
	})
}

const deleteClientProfile = async (userId: string) => {
	return prismaClient.client.create({
		data: {
			userId
		}
	})
}

const replaceProfileAvatar = (userId: string, input: any) => {}

export default {
	getOrCreateMyProfile,
	updateMyProfile,
	replaceProfileAvatar,
	createFreelancerProfile,
	createClientProfile,
	deleteFreelancerProfile,
	deleteClientProfile
}
