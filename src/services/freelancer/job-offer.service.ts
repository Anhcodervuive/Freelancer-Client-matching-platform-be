import { Prisma, JobOfferStatus, JobProposalStatus } from '~/generated/prisma'

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
	type JobOfferPayload
} from '~/services/job-offer/shared'
import chatThreadService from '~/services/chat/chat-thread.service'

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
	return unique.length > 0 ? unique : undefined
}

const listJobOffers = async (freelancerUserId: string, filters: FreelancerJobOfferFilterInput) => {
	await ensureFreelancerUser(freelancerUserId)

	const page = filters.page
	const limit = filters.limit
	const skip = (page - 1) * limit
	const includeExpired = filters.includeExpired === true
	const statuses = normalizeStatuses(filters)

	const andConditions: Prisma.JobOfferWhereInput[] = []

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

	if (!offer || offer.freelancerId !== freelancerUserId || offer.isDeleted) {
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
					respondedAt: now
				},
				include: jobOfferInclude
			})

			const contract = await tx.contract.create({
				data: {
					clientId: offer.clientId,
					freelancerId: offer.freelancerId,
					jobPostId: offer.jobId ?? null,
					proposalId: offer.proposalId ?? null,
					offerId: offer.id,
					title: offer.title,
					currency: offer.currency
				}
			})

			return { updatedOffer, contract }
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

	return serializeJobOffer(declined)
}

const freelancerJobOfferService = {
	listJobOffers,
	getJobOfferDetail,
	respondToJobOffer
}

export default freelancerJobOfferService
