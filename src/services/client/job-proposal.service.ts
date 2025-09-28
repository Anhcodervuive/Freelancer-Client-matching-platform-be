import {
        Prisma,
        JobProposalStatus,
        MatchInteractionSource,
        MatchInteractionType,
        NotificationCategory,
        NotificationEvent,
        NotificationResource,
        Role
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JobProposalFilterInput } from '~/schema/job-proposal.schema'
import { jobProposalInclude, serializeJobProposal } from '~/services/job-proposal/shared'
import matchInteractionService from '~/services/match-interaction.service'
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
                where: { userId },
                select: { userId: true }
        })

        if (!client) {
                throw new UnauthorizedException('Chỉ client mới có thể xem proposal', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
}

const ensureJobOwnedByClient = async (jobId: string, clientId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        clientId: true,
                        isDeleted: true
                }
        })

        if (!job || job.isDeleted || job.clientId !== clientId) {
                throw new NotFoundException('Công việc không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return job
}

const findProposalForClient = async (proposalId: string, jobId: string, clientId: string) => {
        const proposal = await prismaClient.jobProposal.findFirst({
                where: {
                        id: proposalId,
                        jobId,
                        job: {
                                is: {
                                        clientId,
                                        isDeleted: false
                                }
                        }
                },
                include: jobProposalInclude
        })

        if (!proposal) {
                throw new NotFoundException('Proposal không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return proposal
}

const normalizeStatuses = (filters: JobProposalFilterInput): JobProposalStatus[] | undefined => {
        const statuses: JobProposalStatus[] = []
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

const listJobProposalsForJob = async (clientUserId: string, jobId: string, filters: JobProposalFilterInput) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(jobId, clientUserId)

        const page = filters.page
        const limit = filters.limit
        const statuses = normalizeStatuses(filters)

        const andConditions: Prisma.JobProposalWhereInput[] = []

        if (filters.submittedFrom || filters.submittedTo) {
                andConditions.push({
                        submittedAt: {
                                ...(filters.submittedFrom ? { gte: filters.submittedFrom } : {}),
                                ...(filters.submittedTo ? { lte: filters.submittedTo } : {})
                        }
                })
        }

        if (filters.search) {
                const search = filters.search
                andConditions.push({
                        OR: [
                                {
                                        freelancer: {
                                                is: {
                                                        profile: {
                                                                is: {
                                                                        OR: [
                                                                                {
                                                                                        firstName: { contains: search }
                                                                                },
                                                                                {
                                                                                        lastName: { contains: search }
                                                                                }
                                                                        ]
                                                                }
                                                        }
                                                }
                                        }
                                },
                                {
                                        freelancer: {
                                                is: {
                                                        title: { contains: search }
                                                }
                                        }
                                },
                                { coverLetter: { contains: search } }
                        ]
                })
        }

        if (filters.freelancerId) {
                andConditions.push({ freelancerId: filters.freelancerId })
        }

        const where: Prisma.JobProposalWhereInput = {
                jobId,
                ...(statuses
                        ? {
                                  status: statuses.length === 1 ? statuses[0]! : { in: statuses }
                          }
                        : {}),
                ...(andConditions.length > 0 ? { AND: andConditions } : {})
        }

        let orderBy: Prisma.JobProposalOrderByWithRelationInput | Prisma.JobProposalOrderByWithRelationInput[] = {
                submittedAt: Prisma.SortOrder.desc
        }

        switch (filters.sortBy) {
                case 'oldest':
                        orderBy = { submittedAt: Prisma.SortOrder.asc }
                        break
                case 'bid-asc':
                        orderBy = { bidAmount: Prisma.SortOrder.asc }
                        break
                case 'bid-desc':
                        orderBy = { bidAmount: Prisma.SortOrder.desc }
                        break
                default:
                        orderBy = { submittedAt: Prisma.SortOrder.desc }
                        break
        }

        const [items, total] = await prismaClient.$transaction([
                prismaClient.jobProposal.findMany({
                        where,
                        include: jobProposalInclude,
                        orderBy,
                        skip: (page - 1) * limit,
                        take: limit
                }),
                prismaClient.jobProposal.count({ where })
        ])

        return {
                data: items.map(serializeJobProposal),
                total,
                page,
                limit
        }
}

const acceptJobProposalInterview = async (clientUserId: string, jobId: string, proposalId: string) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(jobId, clientUserId)

        const proposal = await findProposalForClient(proposalId, jobId, clientUserId)

        if (proposal.status === JobProposalStatus.WITHDRAWN) {
                throw new BadRequestException('Proposal đã được freelancer rút lại', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.DECLINED) {
                throw new BadRequestException('Proposal đã bị từ chối trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.HIRED) {
                throw new BadRequestException('Proposal đã được chấp nhận tuyển dụng', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.INTERVIEWING) {
                throw new BadRequestException('Proposal đã ở trạng thái phỏng vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        const updated = await prismaClient.jobProposal.update({
                where: { id: proposal.id },
                data: { status: JobProposalStatus.INTERVIEWING },
                include: jobProposalInclude
        })

        try {
                await matchInteractionService.recordInteraction({
                        type: MatchInteractionType.PROPOSAL_INTERVIEWING,
                        source: MatchInteractionSource.DIRECT,
                        jobId: updated.jobId,
                        freelancerId: updated.freelancerId,
                        clientId: clientUserId,
                        proposalId: updated.id,
                        actorProfileId: clientUserId,
                        actorRole: Role.CLIENT
                })
        } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Không thể ghi lại tương tác khi chuyển proposal sang trạng thái phỏng vấn', error)
        }

        try {
                await notificationService.create({
                        recipientId: updated.freelancerId,
                        actorId: clientUserId,
                        category: NotificationCategory.PROPOSAL,
                        event: NotificationEvent.JOB_ACCEPT,
                        resourceType: NotificationResource.JOB_PROPOSAL,
                        resourceId: updated.id,
                        payload: {
                                jobId: updated.jobId,
                                proposalId: updated.id,
                                status: updated.status
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi client chấp nhận phỏng vấn', notificationError)
        }

        return serializeJobProposal(updated)
}

const declineJobProposal = async (clientUserId: string, jobId: string, proposalId: string) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(jobId, clientUserId)

        const proposal = await findProposalForClient(proposalId, jobId, clientUserId)

        if (proposal.status === JobProposalStatus.WITHDRAWN) {
                throw new BadRequestException('Proposal đã được freelancer rút lại', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.DECLINED) {
                throw new BadRequestException('Proposal đã bị từ chối', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.HIRED) {
                throw new BadRequestException('Không thể từ chối proposal đã được thuê', ErrorCode.PARAM_QUERY_ERROR)
        }

        const updated = await prismaClient.jobProposal.update({
                where: { id: proposal.id },
                data: { status: JobProposalStatus.DECLINED },
                include: jobProposalInclude
        })

        try {
                await notificationService.create({
                        recipientId: updated.freelancerId,
                        actorId: clientUserId,
                        category: NotificationCategory.PROPOSAL,
                        event: NotificationEvent.JOB_INVITATION_DECLINED,
                        resourceType: NotificationResource.JOB_PROPOSAL,
                        resourceId: updated.id,
                        payload: {
                                jobId: updated.jobId,
                                proposalId: updated.id,
                                status: updated.status
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi client từ chối proposal', notificationError)
        }

        return serializeJobProposal(updated)
}

const hireFreelancerFromProposal = async (clientUserId: string, jobId: string, proposalId: string) => {
        await ensureClientUser(clientUserId)
        await ensureJobOwnedByClient(jobId, clientUserId)

        const proposal = await findProposalForClient(proposalId, jobId, clientUserId)

        if (proposal.status === JobProposalStatus.WITHDRAWN) {
                throw new BadRequestException('Proposal đã được freelancer rút lại', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.DECLINED) {
                throw new BadRequestException('Không thể thuê freelancer từ proposal đã bị từ chối', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.HIRED) {
                throw new BadRequestException('Proposal đã được thuê trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        const updated = await prismaClient.jobProposal.update({
                where: { id: proposal.id },
                data: { status: JobProposalStatus.HIRED },
                include: jobProposalInclude
        })

        try {
                await matchInteractionService.recordInteraction({
                        type: MatchInteractionType.PROPOSAL_HIRED,
                        source: MatchInteractionSource.DIRECT,
                        jobId: updated.jobId,
                        freelancerId: updated.freelancerId,
                        clientId: clientUserId,
                        proposalId: updated.id,
                        actorProfileId: clientUserId,
                        actorRole: Role.CLIENT
                })
        } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Không thể ghi lại tương tác khi client thuê freelancer', error)
        }

        try {
                await notificationService.create({
                        recipientId: updated.freelancerId,
                        actorId: clientUserId,
                        category: NotificationCategory.PROPOSAL,
                        event: NotificationEvent.JOB_HIRE,
                        resourceType: NotificationResource.JOB_PROPOSAL,
                        resourceId: updated.id,
                        payload: {
                                jobId: updated.jobId,
                                proposalId: updated.id,
                                status: updated.status
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi client thuê freelancer', notificationError)
        }

        return serializeJobProposal(updated)
}

const clientJobProposalService = {
        listJobProposalsForJob,
        acceptJobProposalInterview,
        declineJobProposal,
        hireFreelancerFromProposal
}

export default clientJobProposalService
