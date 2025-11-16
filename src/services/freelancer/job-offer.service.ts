import {
        Prisma,
        JobOfferStatus,
        JobProposalStatus,
        NotificationCategory,
        NotificationEvent,
        NotificationResource,
        ContractStatus
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { FreelancerJobOfferFilterInput, RespondJobOfferInput } from '~/schema/job-offer.schema'
import {
        jobOfferInclude,
        jobOfferSummaryInclude,
        serializeJobOffer,
        type JobOfferPayload,
        AUTO_WITHDRAW_REASON_HIRED
} from '~/services/job-offer/shared'
import chatThreadService from '~/services/chat/chat-thread.service'
import notificationService from '~/services/notification.service'
import platformTermsService from '~/services/platform-terms.service'
import contractSignatureService from '~/services/contract-signature.service'

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
		throw new UnauthorizedException('Chỉ freelancer mới có thể quản lý offer', ErrorCode.USER_NOT_AUTHORITY)
	}

	return freelancer
}

const normalizeStatuses = (filters: FreelancerJobOfferFilterInput): JobOfferStatus[] | undefined => {
	const statuses: JobOfferStatus[] = []

	if (filters.status) {
		statuses.push(filters.status)
	}

	if (filters.statuses) {
		for (const status of filters.statuses) {
			statuses.push(status)
		}
	}

	const unique = uniquePreserveOrder(statuses)
	const sanitized = unique.filter((status) => status !== JobOfferStatus.DRAFT)
	return sanitized.length > 0 ? sanitized : undefined
}

const listJobOffers = async (freelancerUserId: string, filters: FreelancerJobOfferFilterInput) => {
	await ensureFreelancerUser(freelancerUserId)

	const page = filters.page
	const limit = filters.limit
	const skip = (page - 1) * limit
	const includeExpired = filters.includeExpired === true
	const statuses = normalizeStatuses(filters)

	const andConditions: Prisma.JobOfferWhereInput[] = [
		{ status: { not: JobOfferStatus.DRAFT } }
	]

	if (filters.jobId) {
		andConditions.push({ jobId: filters.jobId })
	}

	if (statuses) {
		andConditions.push({
			status: statuses.length === 1 ? statuses[0]! : { in: statuses }
		})
	}

	if (!includeExpired) {
		andConditions.push({
			OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }]
		})
	}

	if (filters.search) {
		const search = filters.search
		andConditions.push({
			OR: [
				{ title: { contains: search } },
				{ message: { contains: search } },
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
							OR: [
								{ companyName: { contains: search } },
								{
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
							]
						}
					}
				}
			]
		})
	}

	const where: Prisma.JobOfferWhereInput = {
		freelancerId: freelancerUserId,
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

const getJobOfferDetail = async (freelancerUserId: string, offerId: string) => {
	await ensureFreelancerUser(freelancerUserId)

	const offer = await prismaClient.jobOffer.findUnique({
		where: { id: offerId },
		include: jobOfferInclude
	})

	if (!offer || offer.freelancerId !== freelancerUserId || offer.isDeleted || offer.status === JobOfferStatus.DRAFT) {
		throw new NotFoundException('Offer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	return serializeJobOffer(offer)
}

const ensureOfferRespondable = (offer: JobOfferPayload) => {
        if (offer.status === JobOfferStatus.DRAFT) {
                throw new BadRequestException('Offer chưa được gửi cho bạn', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (offer.status === JobOfferStatus.ACCEPTED) {
                throw new BadRequestException('Offer đã được chấp thuận trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (offer.status === JobOfferStatus.DECLINED) {
                throw new BadRequestException('Offer đã bị từ chối trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (offer.status === JobOfferStatus.WITHDRAWN) {
                throw new BadRequestException('Offer đã bị client rút lại', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (offer.status === JobOfferStatus.EXPIRED) {
                throw new BadRequestException('Offer đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
        }
}

const notifyClientOfferDeclined = async (freelancerId: string, offer: JobOfferPayload) => {
        const serializedOffer = serializeJobOffer(offer)

        try {
                await notificationService.create({
                        recipientId: offer.clientId,
                        actorId: freelancerId,
                        category: NotificationCategory.JOB,
                        event: NotificationEvent.JOB_OFFER_DECLINED,
                        resourceType: NotificationResource.JOB_OFFER,
                        resourceId: offer.id,
                        payload: {
                                jobId: offer.jobId,
                                offerId: offer.id,
                                offer: serializedOffer
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi freelancer từ chối offer', notificationError)
        }
}

const notifyFreelancerOfferWithdrawn = async (
        clientId: string,
        offer: JobOfferPayload,
        extraPayload: Record<string, unknown> = {}
) => {
        const serializedOffer = serializeJobOffer(offer)

        try {
                await notificationService.create({
                        recipientId: offer.freelancerId,
                        actorId: clientId,
                        category: NotificationCategory.JOB,
                        event: NotificationEvent.JOB_OFFER_WITHDRAWN,
                        resourceType: NotificationResource.JOB_OFFER,
                        resourceId: offer.id,
                        payload: {
                                jobId: offer.jobId,
                                offerId: offer.id,
                                offer: serializedOffer,
                                ...extraPayload
                        }
                })
        } catch (notificationError) {
                // eslint-disable-next-line no-console
                console.error('Không thể tạo thông báo khi offer bị rút tự động', notificationError)
        }
}

const respondToJobOffer = async (freelancerUserId: string, offerId: string, payload: RespondJobOfferInput) => {
	await ensureFreelancerUser(freelancerUserId)

	const offer = await prismaClient.jobOffer.findUnique({
		where: { id: offerId },
		include: jobOfferInclude
	})

	if (!offer || offer.freelancerId !== freelancerUserId || offer.isDeleted) {
		throw new NotFoundException('Offer không tồn tại', ErrorCode.ITEM_NOT_FOUND)
	}

	ensureOfferRespondable(offer)

	const now = new Date()

	if (offer.expireAt && offer.expireAt.getTime() <= Date.now()) {
		await prismaClient.jobOffer.update({
			where: { id: offer.id },
			data: {
				status: JobOfferStatus.EXPIRED,
				respondedAt: now
			}
		})

		throw new BadRequestException('Offer đã hết hạn', ErrorCode.PARAM_QUERY_ERROR)
	}

        if (payload.action === 'ACCEPT') {
                const existingContract = await prismaClient.contract.findFirst({
                        where: { offerId: offer.id }
                })

                if (existingContract) {
                        throw new BadRequestException('Offer đã có hợp đồng trước đó', ErrorCode.PARAM_QUERY_ERROR)
                }

                const result = await prismaClient.$transaction(async tx => {
                        if (offer.jobId) {
                                const hiredOffer = await tx.jobOffer.findFirst({
                                        where: {
                                                jobId: offer.jobId,
                                                status: JobOfferStatus.ACCEPTED,
                                                isDeleted: false,
                                                id: { not: offer.id }
                                        },
                                        select: { id: true }
                                })

                                if (hiredOffer) {
                                        throw new BadRequestException(
                                                'Công việc đã có freelancer được thuê trước đó',
                                                ErrorCode.PARAM_QUERY_ERROR
                                        )
                                }
                        }

                        let withdrawnOffers: JobOfferPayload[] = []

                        if (offer.jobId) {
                                const offersToWithdraw = await tx.jobOffer.findMany({
                                        where: {
                                                jobId: offer.jobId,
                                                status: JobOfferStatus.SENT,
                                                isDeleted: false,
                                                id: { not: offer.id }
                                        },
                                        include: jobOfferInclude
                                })

                                if (offersToWithdraw.length > 0) {
                                        const withdrawIds = offersToWithdraw.map((item) => item.id)
                                        await tx.jobOffer.updateMany({
                                                where: { id: { in: withdrawIds } },
                                                data: {
                                                        status: JobOfferStatus.WITHDRAWN,
                                                        respondedAt: now,
                                                        withdrawReason: AUTO_WITHDRAW_REASON_HIRED
                                                }
                                        })

                                        withdrawnOffers = offersToWithdraw.map((item) => ({
                                                ...item,
                                                status: JobOfferStatus.WITHDRAWN,
                                                respondedAt: now,
                                                withdrawReason: AUTO_WITHDRAW_REASON_HIRED
                                        })) as JobOfferPayload[]
                                }
                        }

                        if (offer.proposalId) {
                                await tx.jobProposal.update({
                                        where: { id: offer.proposalId },
                                        data: { status: JobProposalStatus.HIRED }
                                })
                        }

                        const updatedOffer = await tx.jobOffer.update({
                                where: { id: offer.id },
                                data: {
                                        status: JobOfferStatus.ACCEPTED,
                                        respondedAt: now,
                                        withdrawReason: null
                                },
                                include: jobOfferInclude
                        })

                        const activeTerms = await platformTermsService.ensureLatestActiveTermsRecord(tx)

                        const contract = await tx.contract.create({
                                data: {
                                        clientId: offer.clientId,
                                        freelancerId: offer.freelancerId,
                                        jobPostId: offer.jobId ?? null,
                                        proposalId: offer.proposalId ?? null,
                                        offerId: offer.id,
                                        title: offer.title,
                                        currency: offer.currency,
                                        status: ContractStatus.DRAFT,
                                        platformTermsId: activeTerms.id,
                                        platformTermsVersion: activeTerms.version,
                                        platformTermsSnapshot:
                                                activeTerms.body === null ? Prisma.JsonNull : activeTerms.body
                                }
                        })

                        return { updatedOffer, contract, withdrawnOffers }
                })

                if (offer.jobId && offer.proposalId) {
                        await chatThreadService.ensureProjectThreadForProposal({
                                jobPostId: offer.jobId,
                                proposalId: offer.proposalId,
                                clientId: offer.clientId,
                                freelancerId: offer.freelancerId,
                                jobTitle: offer.job?.title ?? offer.title,
                                contractId: result.contract.id
                        })
                }

                if (contractSignatureService.isDocuSignEnabled()) {
                        try {
                                await contractSignatureService.triggerDocuSignEnvelope(
                                        result.contract.id,
                                        null,
                                        undefined,
                                        { skipAuthorization: true }
                                )
                        } catch (error) {
                                console.error('Không thể gửi envelope DocuSign', error)
                        }
                }

                if (result.withdrawnOffers.length > 0) {
                        await Promise.all(
                                result.withdrawnOffers.map((withdrawnOffer) =>
                                        notifyFreelancerOfferWithdrawn(result.updatedOffer.clientId, withdrawnOffer, {
                                                action: 'withdrawn',
                                                withdrawReason:
                                                        withdrawnOffer.withdrawReason ?? AUTO_WITHDRAW_REASON_HIRED,
                                                autoWithdraw: true
                                        })
                                )
                        )
                }

                return serializeJobOffer(result.updatedOffer)
        }

        const declined = await prismaClient.jobOffer.update({
                where: { id: offer.id },
                data: {
                        status: JobOfferStatus.DECLINED,
                        respondedAt: now
                },
                include: jobOfferInclude
        })

        await notifyClientOfferDeclined(freelancerUserId, declined)

        return serializeJobOffer(declined)
}

const freelancerJobOfferService = {
	listJobOffers,
	getJobOfferDetail,
	respondToJobOffer
}

export default freelancerJobOfferService
