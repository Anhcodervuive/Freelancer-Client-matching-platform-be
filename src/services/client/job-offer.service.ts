import {
        Prisma,
        JobOfferStatus,
        JobOfferType
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreateJobOfferInput,
        JobOfferFilterInput,
        UpdateJobOfferInput
} from '~/schema/job-offer.schema'
import {
        jobOfferInclude,
        jobOfferSummaryInclude,
        serializeJobOffer
} from '~/services/job-offer/shared'

const ensureClientUser = async (userId: string) => {
        const client = await prismaClient.client.findUnique({
                where: { userId }
        })

        if (!client) {
                throw new UnauthorizedException('Chỉ client mới có thể quản lý offer', ErrorCode.USER_NOT_AUTHORITY)
        }

        return client
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

const ensureJobOwnedByClient = async (jobId: string, clientId: string) => {
        const job = await prismaClient.jobPost.findUnique({
                where: { id: jobId },
                select: {
                        id: true,
                        clientId: true,
                        isDeleted: true
                }
        })

        if (!job || job.clientId !== clientId || job.isDeleted) {
                throw new NotFoundException('Job post không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return job
}

const ensureProposalBelongsToClient = async (proposalId: string, clientId: string) => {
        const proposal = await prismaClient.jobProposal.findUnique({
                where: { id: proposalId },
                select: {
                        id: true,
                        jobId: true,
                        freelancerId: true,
                        job: {
                                select: {
                                        clientId: true,
                                        isDeleted: true
                                }
                        }
                }
        })

        if (!proposal || !proposal.job || proposal.job.clientId !== clientId || proposal.job.isDeleted) {
                throw new NotFoundException('Proposal không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return proposal
}

const ensureInvitationBelongsToClient = async (invitationId: string, clientId: string) => {
        const invitation = await prismaClient.jobInvitation.findUnique({
                where: { id: invitationId },
                select: {
                        id: true,
                        jobId: true,
                        freelancerId: true,
                        clientId: true,
                        job: {
                                select: {
                                        isDeleted: true
                                }
                        }
                }
        })

        if (!invitation || invitation.clientId !== clientId || invitation.job?.isDeleted) {
                throw new NotFoundException('Lời mời không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return invitation
}

const createJobOffer = async (clientUserId: string, payload: CreateJobOfferInput) => {
        await ensureClientUser(clientUserId)
        await ensureFreelancerExists(payload.freelancerId)

        let jobId = payload.jobId ?? null
        let proposalId = payload.proposalId ?? null
        let invitationId = payload.invitationId ?? null

        if (proposalId) {
                const proposal = await ensureProposalBelongsToClient(proposalId, clientUserId)

                if (proposal.freelancerId !== payload.freelancerId) {
                        throw new BadRequestException(
                                'Proposal không thuộc freelancer này',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                if (jobId && jobId !== proposal.jobId) {
                        throw new BadRequestException('Job không khớp với proposal', ErrorCode.PARAM_QUERY_ERROR)
                }

                jobId = proposal.jobId
        }

        if (invitationId) {
                const invitation = await ensureInvitationBelongsToClient(invitationId, clientUserId)

                if (invitation.freelancerId !== payload.freelancerId) {
                        throw new BadRequestException(
                                'Lời mời không thuộc freelancer này',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                if (jobId && jobId !== invitation.jobId) {
                        throw new BadRequestException('Job không khớp với lời mời', ErrorCode.PARAM_QUERY_ERROR)
                }

                jobId = invitation.jobId
        }

        if (jobId) {
                await ensureJobOwnedByClient(jobId, clientUserId)
        }

        const sendNow = payload.sendNow === true
        const now = new Date()

        const offer = await prismaClient.jobOffer.create({
                data: {
                        jobId,
                        clientId: clientUserId,
                        freelancerId: payload.freelancerId,
                        proposalId,
                        invitationId,
                        title: payload.title,
                        message: payload.message && payload.message.length > 0 ? payload.message : null,
                        currency: payload.currency.toUpperCase(),
                        fixedPrice: new Prisma.Decimal(payload.fixedPrice),
                        type: JobOfferType.FIXED_PRICE,
                        startDate: payload.startDate ?? null,
                        expireAt: payload.expireAt ?? null,
                        status: sendNow ? JobOfferStatus.SENT : JobOfferStatus.DRAFT,
                        sentAt: sendNow ? now : null
                },
                include: jobOfferInclude
        })

        return serializeJobOffer(offer)
}

const listJobOffers = async (clientUserId: string, filters: JobOfferFilterInput) => {
        await ensureClientUser(clientUserId)

        const page = filters.page
        const limit = filters.limit
        const skip = (page - 1) * limit
        const includeExpired = filters.includeExpired === true

        const andConditions: Prisma.JobOfferWhereInput[] = []

        if (filters.jobId) {
                andConditions.push({ jobId: filters.jobId })
        }

        if (filters.freelancerId) {
                andConditions.push({ freelancerId: filters.freelancerId })
        }

        if (filters.status) {
                andConditions.push({ status: filters.status })
        }

        if (filters.search) {
                const search = filters.search
                andConditions.push({
                        OR: [
                                { title: { contains: search, mode: 'insensitive' } },
                                { message: { contains: search, mode: 'insensitive' } }
                        ]
                })
        }

        if (!includeExpired) {
                andConditions.push({
                        OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }]
                })
        }

        const where: Prisma.JobOfferWhereInput = {
                clientId: clientUserId,
                ...(andConditions.length > 0 ? { AND: andConditions } : {})
        }

        let orderBy: Prisma.JobOfferOrderByWithRelationInput = { createdAt: 'desc' }

        switch (filters.sortBy) {
                case 'oldest':
                        orderBy = { createdAt: 'asc' }
                        break
                case 'price-high':
                        orderBy = { fixedPrice: 'desc' }
                        break
                case 'price-low':
                        orderBy = { fixedPrice: 'asc' }
                        break
                default:
                        orderBy = { createdAt: 'desc' }
        }

        const [total, items] = await prismaClient.$transaction([
                prismaClient.jobOffer.count({ where }),
                prismaClient.jobOffer.findMany({
                        where,
                        include: jobOfferSummaryInclude,
                        orderBy,
                        skip,
                        take: limit
                })
        ])

        return {
                page,
                limit,
                total,
                data: items.map(serializeJobOffer)
        }
}

const getJobOfferDetail = async (clientUserId: string, offerId: string) => {
        await ensureClientUser(clientUserId)

        const offer = await prismaClient.jobOffer.findUnique({
                where: { id: offerId },
                include: jobOfferInclude
        })

        if (!offer || offer.clientId !== clientUserId || offer.isDeleted) {
                throw new NotFoundException('Offer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        return serializeJobOffer(offer)
}

const updateJobOffer = async (
        clientUserId: string,
        offerId: string,
        payload: UpdateJobOfferInput
) => {
        await ensureClientUser(clientUserId)

        const existing = await prismaClient.jobOffer.findUnique({
                where: { id: offerId },
                select: {
                        id: true,
                        clientId: true,
                        freelancerId: true,
                        jobId: true,
                        proposalId: true,
                        invitationId: true,
                        status: true,
                        isDeleted: true
                }
        })

        if (!existing || existing.clientId !== clientUserId || existing.isDeleted) {
                throw new NotFoundException('Offer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (existing.status !== JobOfferStatus.DRAFT && existing.status !== JobOfferStatus.SENT) {
                throw new BadRequestException(
                        'Không thể cập nhật offer ở trạng thái hiện tại',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        let freelancerId = existing.freelancerId

        if (payload.freelancerId && payload.freelancerId !== existing.freelancerId) {
                await ensureFreelancerExists(payload.freelancerId)
                freelancerId = payload.freelancerId
        }

        let jobId = existing.jobId
        let proposalId = existing.proposalId
        let invitationId = existing.invitationId
        let shouldUpdateJobId = false
        let shouldUpdateProposalId = false
        let shouldUpdateInvitationId = false

        if (Object.prototype.hasOwnProperty.call(payload, 'jobId')) {
                jobId = payload.jobId ?? null
                shouldUpdateJobId = true
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'proposalId')) {
                proposalId = payload.proposalId ?? null
                shouldUpdateProposalId = true
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'invitationId')) {
                invitationId = payload.invitationId ?? null
                shouldUpdateInvitationId = true
        }

        if (proposalId) {
                const proposal = await ensureProposalBelongsToClient(proposalId, clientUserId)

                if (proposal.freelancerId !== freelancerId) {
                        throw new BadRequestException(
                                'Proposal không thuộc freelancer này',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                if (jobId && jobId !== proposal.jobId) {
                        throw new BadRequestException('Job không khớp với proposal', ErrorCode.PARAM_QUERY_ERROR)
                }

                if (jobId !== proposal.jobId) {
                        jobId = proposal.jobId
                        shouldUpdateJobId = true
                }
        }

        if (invitationId) {
                const invitation = await ensureInvitationBelongsToClient(invitationId, clientUserId)

                if (invitation.freelancerId !== freelancerId) {
                        throw new BadRequestException(
                                'Lời mời không thuộc freelancer này',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                if (jobId && jobId !== invitation.jobId) {
                        throw new BadRequestException('Job không khớp với lời mời', ErrorCode.PARAM_QUERY_ERROR)
                }

                if (jobId !== invitation.jobId) {
                        jobId = invitation.jobId
                        shouldUpdateJobId = true
                }
        }

        if (jobId) {
                await ensureJobOwnedByClient(jobId, clientUserId)
        }

        const data: Prisma.JobOfferUpdateInput = {}

        if (freelancerId !== existing.freelancerId) {
                data.freelancerId = freelancerId
        }

        if (shouldUpdateJobId) {
                data.jobId = jobId
        }

        if (shouldUpdateProposalId) {
                data.proposalId = proposalId
        }

        if (shouldUpdateInvitationId) {
                data.invitationId = invitationId
        }

        if (payload.title !== undefined) {
                data.title = payload.title
        }

        if (payload.message !== undefined) {
                data.message = payload.message && payload.message.length > 0 ? payload.message : null
        }

        if (payload.currency !== undefined) {
                data.currency = payload.currency.toUpperCase()
        }

        if (payload.fixedPrice !== undefined) {
                data.fixedPrice = new Prisma.Decimal(payload.fixedPrice)
        }

        if (payload.startDate !== undefined) {
                data.startDate = payload.startDate ?? null
        }

        if (payload.expireAt !== undefined) {
                data.expireAt = payload.expireAt ?? null
        }

        const sendNow = payload.sendNow === true
        const now = new Date()

        if (payload.status) {
                if (payload.status === JobOfferStatus.SENT) {
                        data.status = JobOfferStatus.SENT
                        data.sentAt = now
                        data.respondedAt = null
                } else if (payload.status === JobOfferStatus.DRAFT) {
                        data.status = JobOfferStatus.DRAFT
                        data.sentAt = null
                        data.respondedAt = null
                } else if (payload.status === JobOfferStatus.WITHDRAWN) {
                        data.status = JobOfferStatus.WITHDRAWN
                        data.respondedAt = now
                }
        } else if (sendNow) {
                if (existing.status === JobOfferStatus.SENT) {
                        data.sentAt = now
                } else {
                        data.status = JobOfferStatus.SENT
                        data.sentAt = now
                }
        }

        const updated = await prismaClient.jobOffer.update({
                where: { id: offerId },
                data,
                include: jobOfferInclude
        })

        return serializeJobOffer(updated)
}

const deleteJobOffer = async (clientUserId: string, offerId: string) => {
        await ensureClientUser(clientUserId)

        const offer = await prismaClient.jobOffer.findUnique({
                where: { id: offerId },
                select: {
                        id: true,
                        clientId: true,
                        status: true,
                        isDeleted: true
                }
        })

        if (!offer || offer.clientId !== clientUserId || offer.isDeleted) {
                        throw new NotFoundException('Offer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
        }

        if (offer.status !== JobOfferStatus.DRAFT && offer.status !== JobOfferStatus.SENT) {
                throw new BadRequestException('Chỉ xóa offer ở trạng thái nháp hoặc đã gửi', ErrorCode.PARAM_QUERY_ERROR)
        }

        await prismaClient.jobOffer.softDelete({ id: offer.id }, clientUserId)
}

const jobOfferService = {
        createJobOffer,
        listJobOffers,
        getJobOfferDetail,
        updateJobOffer,
        deleteJobOffer
}

export default jobOfferService
