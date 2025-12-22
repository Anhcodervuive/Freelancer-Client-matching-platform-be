import { Prisma, ContractParticipantRole } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import type { AdminReviewListQueryInput } from '~/schema/admin-review.schema'

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export const listReviews = async (query: AdminReviewListQueryInput) => {
	const {
		page,
		limit,
		search,
		reviewerRole,
		minRating,
		maxRating,
		reviewerId,
		revieweeId,
		contractId,
		createdFrom,
		createdTo,
		sortBy,
		sortOrder
	} = query

	const where: Prisma.ContractFeedbackWhereInput = {}

	// Role filter
	if (reviewerRole) {
		where.role = reviewerRole as ContractParticipantRole
	}

	// Rating filter
	if (minRating !== undefined || maxRating !== undefined) {
		where.rating = {}
		if (minRating !== undefined) {
			where.rating.gte = minRating
		}
		if (maxRating !== undefined) {
			where.rating.lte = maxRating
		}
	}

	// Reviewer filter
	if (reviewerId) {
		where.reviewerId = reviewerId
	}

	// Reviewee filter
	if (revieweeId) {
		where.revieweeId = revieweeId
	}

	// Contract filter
	if (contractId) {
		where.contractId = contractId
	}

	// Date range filter
	if (createdFrom || createdTo) {
		where.createdAt = {}
		if (createdFrom) {
			where.createdAt.gte = new Date(createdFrom)
		}
		if (createdTo) {
			where.createdAt.lte = new Date(createdTo)
		}
	}

	// Search filter - search in comment
	if (search) {
		where.OR = [
			{ comment: { contains: search } }
		]
	}

	// Build orderBy
	const orderBy: Prisma.ContractFeedbackOrderByWithRelationInput = {
		[sortBy]: sortOrder
	}

	const [reviews, total] = await Promise.all([
		prismaClient.contractFeedback.findMany({
			where,
			include: {
				reviewer: {
					select: {
						id: true,
						email: true,
						role: true,
						profile: {
							select: {
								firstName: true,
								lastName: true,
								country: true,
								city: true
							}
						}
					}
				},
				reviewee: {
					select: {
						id: true,
						email: true,
						role: true,
						profile: {
							select: {
								firstName: true,
								lastName: true,
								country: true,
								city: true
							}
						}
					}
				},
				contract: {
					select: {
						id: true,
						title: true,
						status: true
					}
				}
			},
			orderBy,
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.contractFeedback.count({ where })
	])

	return {
		data: reviews,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit)
	}
}

export const getReviewDetail = async (reviewId: string) => {
	const review = await prismaClient.contractFeedback.findUnique({
		where: { id: reviewId },
		include: {
			reviewer: {
				select: {
					id: true,
					email: true,
					role: true,
					profile: {
						select: {
							firstName: true,
							lastName: true,
							country: true,
							city: true
						}
					}
				}
			},
			reviewee: {
				select: {
					id: true,
					email: true,
					role: true,
					profile: {
						select: {
							firstName: true,
							lastName: true,
							country: true,
							city: true
						}
					}
				}
			},
			contract: {
				select: {
					id: true,
					title: true,
					status: true,
					currency: true,
					createdAt: true,
					endedAt: true,
					client: {
						select: {
							userId: true,
							companyName: true,
							profile: {
								select: {
									firstName: true,
									lastName: true
								}
							}
						}
					},
					freelancer: {
						select: {
							userId: true,
							title: true,
							profile: {
								select: {
									firstName: true,
									lastName: true
								}
							}
						}
					}
				}
			}
		}
	})

	if (!review) {
		throw new NotFoundException('Không tìm thấy đánh giá', ErrorCode.ITEM_NOT_FOUND)
	}

	return review
}

export const getReviewStats = async () => {
	const [
		totalReviews,
		clientReviews,
		freelancerReviews,
		avgRating,
		ratingDistribution
	] = await Promise.all([
		prismaClient.contractFeedback.count(),
		prismaClient.contractFeedback.count({ where: { role: ContractParticipantRole.CLIENT } }),
		prismaClient.contractFeedback.count({ where: { role: ContractParticipantRole.FREELANCER } }),
		prismaClient.contractFeedback.aggregate({
			_avg: { rating: true }
		}),
		Promise.all([
			prismaClient.contractFeedback.count({ where: { rating: 1 } }),
			prismaClient.contractFeedback.count({ where: { rating: 2 } }),
			prismaClient.contractFeedback.count({ where: { rating: 3 } }),
			prismaClient.contractFeedback.count({ where: { rating: 4 } }),
			prismaClient.contractFeedback.count({ where: { rating: 5 } })
		])
	])

	// Recent reviews (last 30 days)
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
	const recentReviews = await prismaClient.contractFeedback.count({
		where: { createdAt: { gte: thirtyDaysAgo } }
	})

	// Positive rate (rating >= 4)
	const positiveReviews = await prismaClient.contractFeedback.count({
		where: { rating: { gte: 4 } }
	})

	return {
		totalReviews,
		clientReviews,
		freelancerReviews,
		averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(2)) : 0,
		ratingDistribution: {
			1: ratingDistribution[0],
			2: ratingDistribution[1],
			3: ratingDistribution[2],
			4: ratingDistribution[3],
			5: ratingDistribution[4]
		},
		recentReviews,
		positiveRate: totalReviews > 0 ? Number(((positiveReviews / totalReviews) * 100).toFixed(1)) : 0
	}
}

export const getUserReviewSummary = async (userId: string) => {
	// Reviews received by this user
	const [
		receivedReviews,
		receivedAvgRating,
		givenReviews
	] = await Promise.all([
		prismaClient.contractFeedback.findMany({
			where: { revieweeId: userId },
			include: {
				reviewer: {
					select: {
						id: true,
						profile: {
							select: {
								firstName: true,
								lastName: true
							}
						}
					}
				},
				contract: {
					select: {
						id: true,
						title: true
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			take: 10
		}),
		prismaClient.contractFeedback.aggregate({
			where: { revieweeId: userId },
			_avg: { rating: true },
			_count: { id: true }
		}),
		prismaClient.contractFeedback.findMany({
			where: { reviewerId: userId },
			include: {
				reviewee: {
					select: {
						id: true,
						profile: {
							select: {
								firstName: true,
								lastName: true
							}
						}
					}
				},
				contract: {
					select: {
						id: true,
						title: true
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			take: 10
		})
	])

	return {
		received: {
			reviews: receivedReviews,
			averageRating: receivedAvgRating._avg.rating ? Number(receivedAvgRating._avg.rating.toFixed(2)) : 0,
			totalCount: receivedAvgRating._count.id
		},
		given: {
			reviews: givenReviews,
			totalCount: givenReviews.length
		}
	}
}

export default {
	listReviews,
	getReviewDetail,
	getReviewStats,
	getUserReviewSummary
}
