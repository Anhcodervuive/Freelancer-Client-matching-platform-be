import {
	Prisma,
	JobInvitationStatus,
	NotificationCategory,
	NotificationEvent,
	NotificationResource
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JobInvitationFilterInput, RespondJobInvitationInput } from '~/schema/job-invitation.schema'
import { jobInvitationInclude, serializeJobInvitation } from '~/services/job-invitation/shared'
import notificationService from '~/services/notification.service'

const uniquePreserveOrder = <T>(items: readonly T[]): T[] => {
	const seen = new Set<T>()
	const result: T[] = []
	for (const item of items) {
		if (seen.has(item)) continue
		seen.add(item)
		result.push(item)
	}
	return result
}

const ensureFreelancerUser = async (userId: string) => {
	const freelancer = await prismaClient.freelancer.findUnique({
		where: { userId },
		select: { userId: true }
	})

	if (!freelancer) {
		throw new UnauthorizedException('Chỉ freelancer mới có thể phản hồi lời mời', ErrorCode.USER_NOT_AUTHORITY)
	}

	return freelancer
}

const normalizeStatuses = (filters: JobInvitationFilterInput): JobInvitationStatus[] | undefined => {
	const statuses: JobInvitationStatus[] = []
	if (filters.status) {
		statuses.push(filters.status)
	}
	if (filters.statuses) {
		for (const status of filters.statuses) {
			statuses.push(status)
		}
	}
	const unique = uniquePreserveOrder(statuses)
	return unique.length > 0 ? unique : undefined
}

const serializeInvitationForFreelancer = (
	invitation: Prisma.JobInvitationGetPayload<{ include: typeof jobInvitationInclude }>
) => {
	const base = serializeJobInvitation(invitation)
	return {
		...base,
		client: invitation.client
			? {
					id: invitation.client.userId,
					profile: {
						firstName: invitation.client.profile?.firstName ?? null,
						lastName: invitation.client.profile?.lastName ?? null
					}
			  }
			: null
	}
}

const listJobInvitations = async (freelancerUserId: string, filters: JobInvitationFilterInput) => {
	await ensureFreelancerUser(freelancerUserId)

	const page = filters.page
	const limit = filters.limit
	const statuses = normalizeStatuses(filters)
	const includeExpired = filters.includeExpired === true

	const andConditions: Prisma.JobInvitationWhereInput[] = []

	if (!includeExpired) {
		andConditions.push({
			OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
		})
	}

	if (filters.sentFrom || filters.sentTo) {
		andConditions.push({
			sentAt: {
				...(filters.sentFrom ? { gte: filters.sentFrom } : {}),
				...(filters.sentTo ? { lte: filters.sentTo } : {})
			}
		})
	}

	if (filters.respondedFrom || filters.respondedTo) {
		andConditions.push({
			respondedAt: {
				...(filters.respondedFrom ? { gte: filters.respondedFrom } : {}),
				...(filters.respondedTo ? { lte: filters.respondedTo } : {})
			}
		})
	}

	if (filters.search) {
		const search = filters.search
		const searchConditions: Prisma.JobInvitationWhereInput[] = [
			{
				job: {
					is: {
						title: { contains: search }
					}
				}
			},
			{
				client: {
					is: {
						profile: {
							is: {
								OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }]
							}
						}
					}
				}
			},
			{
				message: { contains: search }
			}
		]
		andConditions.push({ OR: searchConditions })
	}

	const where: Prisma.JobInvitationWhereInput = {
		freelancerId: freelancerUserId,
		...(filters.jobId ? { jobId: filters.jobId } : {}),
		...(statuses
			? {
					status: statuses.length === 1 ? statuses[0]! : { in: statuses }
			  }
			: {}),
		...(andConditions.length > 0 ? { AND: andConditions } : {})
	}

	let orderBy: Prisma.JobInvitationOrderByWithRelationInput | Prisma.JobInvitationOrderByWithRelationInput[] = {
		sentAt: Prisma.SortOrder.desc
	}

	switch (filters.sortBy) {
		case 'oldest':
			orderBy = { sentAt: Prisma.SortOrder.asc }
			break
		case 'responded-latest':
			orderBy = [{ respondedAt: Prisma.SortOrder.desc }, { sentAt: Prisma.SortOrder.desc }]
			break
		case 'responded-earliest':
			orderBy = [{ respondedAt: Prisma.SortOrder.asc }, { sentAt: Prisma.SortOrder.asc }]
			break
		default:
			orderBy = { sentAt: Prisma.SortOrder.desc }
			break
	}

	const [items, total] = await prismaClient.$transaction([
		prismaClient.jobInvitation.findMany({
			where,
			include: jobInvitationInclude,
			orderBy,
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.jobInvitation.count({ where })
	])

	return {
		data: items.map(serializeInvitationForFreelancer),
		total,
		page,
		limit
	}
}

const getJobInvitationDetail = async (freelancerUserId: string, invitationId: string) => {
	await ensureFreelancerUser(freelancerUserId)

	const invitation = await prismaClient.jobInvitation.findFirst({
		where: {
			id: invitationId,
			freelancerId: freelancerUserId
		},
		include: jobInvitationInclude
	})

	if (!invitation) {
		throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	return serializeInvitationForFreelancer(invitation)
}

const respondToJobInvitation = async (
	freelancerUserId: string,
	invitationId: string,
	payload: RespondJobInvitationInput
) => {
	await ensureFreelancerUser(freelancerUserId)

	const invitation = await prismaClient.jobInvitation.findFirst({
		where: {
			id: invitationId,
			freelancerId: freelancerUserId
		},
		include: jobInvitationInclude
	})

	if (!invitation) {
		throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	if (invitation.status === JobInvitationStatus.ACCEPTED || invitation.status === JobInvitationStatus.DECLINED) {
		throw new BadRequestException('Bạn đã phản hồi lời mời này rồi', ErrorCode.PARAM_QUERY_ERROR)
	}

	if (invitation.status === JobInvitationStatus.EXPIRED) {
		throw new BadRequestException('Lời mời đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
	}

	const now = new Date()

	if (invitation.expiresAt && invitation.expiresAt.getTime() <= now.getTime()) {
		await prismaClient.jobInvitation.update({
			where: { id: invitation.id },
			data: { status: JobInvitationStatus.EXPIRED }
		})

		throw new BadRequestException('Lời mời đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
	}

	const status = payload.status === 'ACCEPTED' ? JobInvitationStatus.ACCEPTED : JobInvitationStatus.DECLINED

	const updatedInvitation = await prismaClient.jobInvitation.update({
		where: { id: invitation.id },
		data: {
			status,
			respondedAt: now
		},
		include: jobInvitationInclude
	})

	const serialized = serializeInvitationForFreelancer(updatedInvitation)

	try {
		await notificationService.create({
			recipientId: invitation.clientId,
			actorId: freelancerUserId,
			category: NotificationCategory.JOB,
			event:
				status === JobInvitationStatus.ACCEPTED
					? NotificationEvent.JOB_INVITATION_ACCEPTED
					: NotificationEvent.JOB_INVITATION_DECLINED,
			resourceType: NotificationResource.JOB_INVITATION,
			resourceId: invitation.id,
			payload: {
				invitationId: invitation.id,
				jobId: invitation.jobId,
				status
			}
		})
	} catch (notificationError) {
		// eslint-disable-next-line no-console
		console.error('Failed to create notification for job invitation response', notificationError)
	}

	return serialized
}

const freelancerJobInvitationService = {
	listJobInvitations,
	getJobInvitationDetail,
	respondToJobInvitation
}

export default freelancerJobInvitationService
