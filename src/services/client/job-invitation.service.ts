import {
        Prisma,
        JobInvitationStatus,
        JobProposalStatus,
        JobStatus,
        NotificationCategory,
        NotificationEvent,
        NotificationResource
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { CreateJobInvitationInput, JobInvitationFilterInput } from '~/schema/job-invitation.schema'
import {
        jobInvitationInclude,
        jobInvitationSummaryInclude,
        serializeJobInvitation
} from '~/services/job-invitation/shared'
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

const ensureClientUser = async (userId: string) => {
        const client = await prismaClient.client.findUnique({
                where: { userId }
        })

        if (!client) {
                throw new UnauthorizedException('Chỉ client mới có thể quản lý lời mời', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
}

const ensureJobOwnedByClient = async (jobId: string, clientId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        clientId: true,
                        status: true,
                        isDeleted: true
                }
        })

        if (!job || job.clientId !== clientId || job.isDeleted) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (job.status !== JobStatus.PUBLISHED) {
                        throw new BadRequestException('Job post không ở trạng thái cho phép mời freelancer', ErrorCode.PARAM_QUERY_ERROR)
        }

        return job
}

const ensureFreelancerExists = async (freelancerId: string) => {
        const freelancer = await prismaClient.freelancer.findUnique({
                where: { userId: freelancerId },
                select: { userId: true }
        })

        if (!freelancer) {
                throw new NotFoundException('Freelancer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return freelancer
}

const ensureNoExistingProposal = async (jobId: string, freelancerId: string) => {
        const proposal = await prismaClient.jobProposal.findUnique({
                where: {
                        jobId_freelancerId: {
                                jobId,
                                freelancerId
                        }
                },
                select: {
                        status: true
                }
        })

        if (proposal && proposal.status !== JobProposalStatus.WITHDRAWN && proposal.status !== JobProposalStatus.DECLINED) {
                throw new BadRequestException('Freelancer đã gửi proposal cho job này', ErrorCode.PARAM_QUERY_ERROR)
        }
}

const createJobInvitation = async (clientUserId: string, payload: CreateJobInvitationInput) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(payload.jobId, clientUserId)
        await ensureFreelancerExists(payload.freelancerId)

        if (payload.freelancerId === clientUserId) {
                throw new BadRequestException('Không thể mời chính mình', ErrorCode.PARAM_QUERY_ERROR)
        }

        await ensureNoExistingProposal(payload.jobId, payload.freelancerId)

        try {
                const invitation = await prismaClient.jobInvitation.create({
                        data: {
                                jobId: payload.jobId,
                                clientId: clientUserId,
                                freelancerId: payload.freelancerId,
                                ...(payload.message ? { message: payload.message } : {}),
                                ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {})
                        },
                        include: jobInvitationInclude
                })

                try {
                        await notificationService.create({
                                recipientId: payload.freelancerId,
                                actorId: clientUserId,
                                category: NotificationCategory.JOB,
                                event: NotificationEvent.JOB_INVITATION_CREATED,
                                resourceType: NotificationResource.JOB_INVITATION,
                                resourceId: invitation.id,
                                payload: {
                                        jobId: payload.jobId,
                                        invitationId: invitation.id
                                }
                        })
                } catch (notificationError) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to create notification for job invitation', notificationError)
                }

                return serializeJobInvitation(invitation)
        } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                        throw new BadRequestException('Freelancer đã được mời vào job này', ErrorCode.PARAM_QUERY_ERROR)
                }
                throw error
        }
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

const listJobInvitations = async (clientUserId: string, filters: JobInvitationFilterInput) => {
        await ensureClientUser(clientUserId)

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
                                freelancer: {
                                        is: {
                                                title: { contains: search },
                                                profile: {
                                                        is: {
                                                                OR: [
                                                                        {
                                                                                firstName: {
                                                                                        contains: search
                                                                                }
                                                                        },
                                                                        {
                                                                                lastName: {
                                                                                        contains: search
                                                                                }
                                                                        }
                                                                ]
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
                clientId: clientUserId,
                ...(filters.jobId ? { jobId: filters.jobId } : {}),
                ...(filters.freelancerId ? { freelancerId: filters.freelancerId } : {}),
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
                        orderBy = [
                                { respondedAt: Prisma.SortOrder.desc },
                                { sentAt: Prisma.SortOrder.desc }
                        ]
                        break
                case 'responded-earliest':
                        orderBy = [
                                { respondedAt: Prisma.SortOrder.asc },
                                { sentAt: Prisma.SortOrder.asc }
                        ]
                        break
                default:
                        orderBy = { sentAt: Prisma.SortOrder.desc }
                        break
        }

        const [items, total] = await prismaClient.$transaction([
                prismaClient.jobInvitation.findMany({
                        where,
                        include: jobInvitationSummaryInclude,
                        orderBy,
                        skip: (page - 1) * limit,
                        take: limit
                }),
                prismaClient.jobInvitation.count({ where })
        ])

        return {
                data: items.map(serializeJobInvitation),
                total,
                page,
                limit
        }
}

const getJobInvitationDetail = async (invitationId: string, clientUserId: string) => {
        await ensureClientUser(clientUserId)

        const invitation = await prismaClient.jobInvitation.findFirst({
                where: {
                        id: invitationId,
                        clientId: clientUserId
                },
                include: jobInvitationInclude
        })

        if (!invitation) {
                throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeJobInvitation(invitation)
}

const deleteJobInvitation = async (invitationId: string, clientUserId: string) => {
        await ensureClientUser(clientUserId)

        const invitation = await prismaClient.jobInvitation.findFirst({
                where: {
                        id: invitationId,
                        clientId: clientUserId
                },
                select: {
                        id: true,
                        status: true
                }
        })

        if (!invitation) {
                throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (
                invitation.status !== JobInvitationStatus.SENT &&
                invitation.status !== JobInvitationStatus.EXPIRED
        ) {
                throw new BadRequestException(
                        'Chỉ có thể xóa lời mời khi freelancer chưa phản hồi',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        await prismaClient.jobInvitation.delete({
                where: { id: invitation.id }
        })
}

const jobInvitationService = {
        createJobInvitation,
        listJobInvitations,
        getJobInvitationDetail,
        deleteJobInvitation
}

export default jobInvitationService
