import {
        Prisma,
        JobStatus,
        JobProposalStatus,
        JobInvitationStatus,
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
import {
        CreateJobProposalInput,
        JobProposalFilterInput,
        UpdateJobProposalInput
} from '~/schema/job-proposal.schema'
import { jobProposalInclude, serializeJobProposal, type JobProposalPayload } from '~/services/job-proposal/shared'
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

const ensureFreelancerUser = async (userId: string) => {
        const freelancer = await prismaClient.freelancer.findUnique({
                where: { userId },
                select: {
                        userId: true,
                        profile: { select: { userId: true } }
                }
        })

        if (!freelancer) {
                throw new UnauthorizedException('Chỉ freelancer mới có thể quản lý proposal', ErrorCode.USER_NOT_AUTHORITY)
        }

        return freelancer
}

const ensureJobAcceptsProposals = async (jobId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        clientId: true,
                        status: true,
                        isDeleted: true
                }
        })

        if (!job || job.isDeleted) {
                throw new NotFoundException('Công việc không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (job.status !== JobStatus.PUBLISHED && job.status !== JobStatus.PUBLISHED_PENDING_REVIEW) {
                throw new BadRequestException('Công việc chưa mở để nhận proposal', ErrorCode.PARAM_QUERY_ERROR)
        }

        return job
}

const ensureInvitationValid = async (invitationId: string, jobId: string, freelancerId: string) => {
        const invitation = await prismaClient.jobInvitation.findUnique({
                where: { id: invitationId },
                select: {
                        id: true,
                        jobId: true,
                        freelancerId: true,
                        status: true,
                        proposal: { select: { id: true } },
                        expiresAt: true
                }
        })

        if (!invitation || invitation.jobId !== jobId || invitation.freelancerId !== freelancerId) {
                throw new NotFoundException('Lời mời không hợp lệ', ErrorCode.ITEM_NOT_FOUND)
        }

        if (invitation.status === JobInvitationStatus.DECLINED) {
                throw new BadRequestException('Lời mời đã bị từ chối', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (invitation.proposal) {
                throw new BadRequestException('Lời mời đã được gắn với một proposal khác', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
                throw new BadRequestException('Lời mời đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
        }

        return invitation
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

const serializeProposalForFreelancer = (proposal: JobProposalPayload) => {
        const base = serializeJobProposal(proposal)
        return {
                ...base,
                job: {
                        ...base.job,
                        client: base.job.client
                                ? {
                                          ...base.job.client,
                                          profile: base.job.client.profile
                                }
                                : null
                }
        }
}

const listJobProposals = async (freelancerUserId: string, filters: JobProposalFilterInput) => {
        await ensureFreelancerUser(freelancerUserId)

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
                                        job: {
                                                is: {
                                                        title: { contains: search }
                                                }
                                        }
                                },
                                { coverLetter: { contains: search } }
                        ]
                })
        }

        const where: Prisma.JobProposalWhereInput = {
                freelancerId: freelancerUserId,
                ...(filters.jobId ? { jobId: filters.jobId } : {}),
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
                data: items.map(serializeProposalForFreelancer),
                total,
                page,
                limit
        }
}

const getJobProposalDetail = async (freelancerUserId: string, proposalId: string) => {
        await ensureFreelancerUser(freelancerUserId)

        const proposal = await prismaClient.jobProposal.findFirst({
                where: {
                        id: proposalId,
                        freelancerId: freelancerUserId
                },
                include: jobProposalInclude
        })

        if (!proposal) {
                throw new NotFoundException('Proposal không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeProposalForFreelancer(proposal)
}

const createJobProposal = async (freelancerUserId: string, payload: CreateJobProposalInput) => {
        const freelancer = await ensureFreelancerUser(freelancerUserId)
        const job = await ensureJobAcceptsProposals(payload.jobId)

        if (job.clientId === freelancerUserId) {
                throw new BadRequestException('Bạn không thể gửi proposal cho công việc của mình', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (payload.invitationId) {
                await ensureInvitationValid(payload.invitationId, payload.jobId, freelancerUserId)
        }

        const existing = await prismaClient.jobProposal.findUnique({
                where: {
                        jobId_freelancerId: {
                                jobId: payload.jobId,
                                freelancerId: freelancerUserId
                        }
                }
        })

        const data: Prisma.JobProposalUncheckedCreateInput = {
                jobId: payload.jobId,
                freelancerId: freelancerUserId,
                ...(payload.coverLetter !== undefined ? { coverLetter: payload.coverLetter } : {}),
                ...(payload.bidAmount !== undefined ? { bidAmount: payload.bidAmount } : {}),
                ...(payload.bidCurrency !== undefined ? { bidCurrency: payload.bidCurrency } : {}),
                ...(payload.estimatedDuration !== undefined
                        ? { estimatedDuration: payload.estimatedDuration }
                        : {})
        }

        if (payload.invitationId) {
                data.invitationId = payload.invitationId
        }

        let proposal: JobProposalPayload

        if (existing) {
                if (existing.status !== JobProposalStatus.WITHDRAWN && existing.status !== JobProposalStatus.DECLINED) {
                        throw new BadRequestException('Bạn đã gửi proposal cho công việc này', ErrorCode.PARAM_QUERY_ERROR)
                }

                proposal = await prismaClient.jobProposal.update({
                        where: { id: existing.id },
                        data: {
                                ...data,
                                status: JobProposalStatus.SUBMITTED,
                                submittedAt: new Date(),
                                withdrawnAt: null
                        },
                        include: jobProposalInclude
                })
        } else {
                proposal = await prismaClient.jobProposal.create({
                        data,
                        include: jobProposalInclude
                })
        }

        try {
                await matchInteractionService.recordInteraction({
                        type: MatchInteractionType.PROPOSAL_SUBMITTED,
                        source: MatchInteractionSource.DIRECT,
                        jobId: proposal.jobId,
                        freelancerId: freelancerUserId,
                        clientId: job.clientId,
                        proposalId: proposal.id,
                        actorProfileId: freelancer.profile?.userId ?? null,
                        actorRole: Role.FREELANCER
                })
        } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Không thể ghi lại tương tác khi gửi proposal', error)
        }

        try {
                await notificationService.create({
                        recipientId: job.clientId,
                        actorId: freelancerUserId,
                        category: NotificationCategory.PROPOSAL,
                        event: NotificationEvent.PROPOSAL_SUBMITTED,
                        resourceType: NotificationResource.JOB_PROPOSAL,
                        resourceId: proposal.id,
                        payload: {
                                jobId: proposal.jobId,
                                proposalId: proposal.id,
                                freelancerId: freelancerUserId
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi gửi proposal', notificationError)
        }

        return serializeProposalForFreelancer(proposal)
}

const updateJobProposal = async (
        freelancerUserId: string,
        proposalId: string,
        payload: UpdateJobProposalInput
) => {
        await ensureFreelancerUser(freelancerUserId)

        const proposal = await prismaClient.jobProposal.findFirst({
                where: {
                        id: proposalId,
                        freelancerId: freelancerUserId
                },
                include: jobProposalInclude
        })

        if (!proposal) {
                throw new NotFoundException('Proposal không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (
                proposal.status === JobProposalStatus.HIRED ||
                proposal.status === JobProposalStatus.WITHDRAWN ||
                proposal.status === JobProposalStatus.DECLINED
        ) {
                throw new BadRequestException('Không thể cập nhật proposal ở trạng thái hiện tại', ErrorCode.PARAM_QUERY_ERROR)
        }

        const data: Prisma.JobProposalUncheckedUpdateInput = {
                ...(payload.coverLetter !== undefined ? { coverLetter: payload.coverLetter } : {}),
                ...(payload.bidAmount !== undefined ? { bidAmount: payload.bidAmount } : {}),
                ...(payload.bidCurrency !== undefined ? { bidCurrency: payload.bidCurrency } : {}),
                ...(payload.estimatedDuration !== undefined
                        ? { estimatedDuration: payload.estimatedDuration }
                        : {})
        }

        const updated = await prismaClient.jobProposal.update({
                where: { id: proposal.id },
                data,
                include: jobProposalInclude
        })

        return serializeProposalForFreelancer(updated)
}

const withdrawJobProposal = async (freelancerUserId: string, proposalId: string) => {
        await ensureFreelancerUser(freelancerUserId)

        const proposal = await prismaClient.jobProposal.findFirst({
                where: {
                        id: proposalId,
                        freelancerId: freelancerUserId
                },
                select: {
                        id: true,
                        status: true
                }
        })

        if (!proposal) {
                throw new NotFoundException('Proposal không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (proposal.status === JobProposalStatus.HIRED) {
                throw new BadRequestException('Không thể rút proposal đã được chấp nhận', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposal.status === JobProposalStatus.WITHDRAWN) {
                        throw new BadRequestException('Proposal đã được rút trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        await prismaClient.jobProposal.update({
                where: { id: proposal.id },
                data: {
                        status: JobProposalStatus.WITHDRAWN,
                        withdrawnAt: new Date()
                }
        })
}

const freelancerJobProposalService = {
        listJobProposals,
        getJobProposalDetail,
        createJobProposal,
        updateJobProposal,
        withdrawJobProposal
}

export default freelancerJobProposalService
