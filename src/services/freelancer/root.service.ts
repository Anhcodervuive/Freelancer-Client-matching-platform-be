import { prismaClient } from '~/config/prisma-client'
import { embeddingEntityQueue } from '~/queues/embedding-entity-moderation.queue'
import { UpdateFreelanceProfileInput } from '~/schema/freelancer.schema'
import { buildFullTextForFreelancer } from '~/utils/embeddingText'

const getByUserId = async (userId: string) => {
	return prismaClient.freelancer.findFirst({
		where: {
			userId
		}
	})
}

const updateBasicInfo = async (userId: string, payload: any) => {
	const updatedFreelancer = await prismaClient.freelancer.update({
		where: { userId },
		data: payload,
		select: { userId: true, title: true, bio: true, links: true }
	})

	const updatedUser = await prismaClient.user.findFirst({
		where: {
			id: userId
		},
		include: {
			profile: {
				include: {
					freelancer: {
						include: {
							freelancerCategorySelection: {
								include: {
									category: true
								}
							},
							freelancerSpecialtySelection: {
								include: {
									specialty: true
								}
							},
							freelancerSkillSelection: {
								include: {
									skill: true
								}
							}
						}
					}
				}
			}
		}
	})

	if (updatedUser?.profile?.freelancer) {
		const embeddingTextPrepareForEmbed = buildFullTextForFreelancer(updatedUser.profile.freelancer)
		console.log('log 1')
		embeddingEntityQueue.add('', {
			entity_type: 'FREELANCER',
			entity_id: updatedUser.profile.freelancer.userId,
			text: embeddingTextPrepareForEmbed,
			kind: 'FULL'
		})
	}
	return updatedFreelancer
}

export default {
	getByUserId,
	updateBasicInfo
}
