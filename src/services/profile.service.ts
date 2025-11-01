import { prismaClient } from '~/config/prisma-client'
import { Role } from '~/generated/prisma'
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

const ensureUserProfile = async (userId: string) => {
        await prismaClient.profile.upsert({
                where: { userId },
                create: { userId },
                update: {}
        })
}

const createFreelancerProfile = async (userId: string) => {
        await ensureUserProfile(userId)

        await prismaClient.client.deleteMany({ where: { userId } })

        await prismaClient.user.update({
                where: {
                        id: userId
                },
                data: {
                        role: Role.FREELANCER
                }
        })

        return prismaClient.freelancer.upsert({
                where: { userId },
                create: { userId },
                update: {}
        })
}

const createClientProfile = async (userId: string) => {
        await ensureUserProfile(userId)

        await prismaClient.freelancer.deleteMany({ where: { userId } })

        await prismaClient.user.update({
                where: {
                        id: userId
                },
                data: {
                        role: Role.CLIENT
                }
        })

        return prismaClient.client.upsert({
                where: { userId },
                create: { userId },
                update: {}
        })
}

const deleteFreelancerProfile = async (userId: string) => {
        await prismaClient.freelancer.deleteMany({ where: { userId } })

        await prismaClient.user.update({
                where: { id: userId },
                data: { role: null }
        })
}

const deleteClientProfile = async (userId: string) => {
        await prismaClient.client.deleteMany({ where: { userId } })

        await prismaClient.user.update({
                where: { id: userId },
                data: { role: null }
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
