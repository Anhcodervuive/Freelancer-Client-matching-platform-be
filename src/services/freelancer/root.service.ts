import { prismaClient } from '~/config/prisma-client'
import { UpdateFreelanceProfileInput } from '~/schema/freelancer.schema'

const getByUserId = async (userId: string) => {
	return prismaClient.freelancer.findFirst({
		where: {
			userId
		}
	})
}

const updateBasicInfo = async (userId: string, payload: any) => {
	return prismaClient.freelancer.update({
		where: { userId },
		data: payload,
		select: { userId: true, title: true, bio: true, links: true }
	})
}

export default {
	getByUserId,
	updateBasicInfo
}
