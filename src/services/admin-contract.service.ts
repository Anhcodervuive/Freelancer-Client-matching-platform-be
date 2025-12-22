import { Prisma, ContractStatus, MilestoneStatus, EscrowStatus } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import type { AdminContractListQueryInput } from '~/schema/admin-contract.schema'

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export const listContracts = async (query: AdminContractListQueryInput) => {
	const {
		page,
		limit,
		search,
		status,
		clientId,
		freelancerId,
		createdFrom,
		createdTo,
		sortBy,
		sortOrder
	} = query

	const where: Prisma.ContractWhereInput = {}

	// Status filter
	if (status) {
		const statuses = status.split(',').filter(s => 
			Object.values(ContractStatus).includes(s as ContractStatus)
		) as ContractStatus[]
		if (statuses.length > 0) {
			where.status = { in: statuses }
		}
	}

	// Client filter
	if (clientId) {
		where.clientId = clientId
	}

	// Freelancer filter
	if (freelancerId) {
		where.freelancerId = freelancerId
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

	// Search filter
	if (search) {
		where.OR = [
			{ title: { contains: search } }
		]
	}

	// Build orderBy
	const orderBy: Prisma.ContractOrderByWithRelationInput = {
		[sortBy]: sortOrder
	}

	const [contracts, total] = await Promise.all([
		prismaClient.contract.findMany({
			where,
			include: {
				client: {
					select: {
						userId: true,
						companyName: true,
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
				freelancer: {
					select: {
						userId: true,
						title: true,
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
				jobPost: {
					select: {
						id: true,
						title: true,
						status: true,
						paymentMode: true,
						budgetAmount: true,
						budgetCurrency: true
					}
				},
				_count: {
					select: {
						milestones: true
					}
				}
			},
			orderBy,
			skip: (page - 1) * limit,
			take: limit
		}),
		prismaClient.contract.count({ where })
	])

	return {
		data: contracts,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit)
	}
}

export const getContractDetail = async (contractId: string) => {
	const contract = await prismaClient.contract.findUnique({
		where: { id: contractId },
		include: {
			client: {
				select: {
					userId: true,
					companyName: true,
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
			freelancer: {
				select: {
					userId: true,
					title: true,
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
			jobPost: {
				select: {
					id: true,
					title: true,
					status: true,
					paymentMode: true,
					budgetAmount: true,
					budgetCurrency: true
				}
			},
			milestones: {
				select: {
					id: true,
					title: true,
					amount: true,
					currency: true,
					status: true,
					startAt: true,
					endAt: true,
					createdAt: true,
					updatedAt: true,
					escrow: {
						select: {
							id: true,
							status: true,
							amountFunded: true,
							amountReleased: true,
							amountRefunded: true,
							currency: true
						}
					}
				},
				orderBy: { createdAt: 'asc' }
			},
			feedbacks: {
				select: {
					id: true,
					rating: true,
					comment: true,
					role: true,
					createdAt: true,
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
					}
				}
			}
		}
	})

	if (!contract) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	// Calculate statistics - using correct MilestoneStatus enum values
	const milestoneStats = {
		total: contract.milestones.length,
		released: contract.milestones.filter(m => m.status === MilestoneStatus.RELEASED).length,
		approved: contract.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length,
		submitted: contract.milestones.filter(m => m.status === MilestoneStatus.SUBMITTED).length,
		open: contract.milestones.filter(m => m.status === MilestoneStatus.OPEN).length,
		canceled: contract.milestones.filter(m => m.status === MilestoneStatus.CANCELED).length,
		disputed: contract.milestones.filter(m => m.escrow?.status === EscrowStatus.DISPUTED).length
	}

	const financialStats = {
		totalFunded: contract.milestones.reduce((sum, m) => {
			const funded = m.escrow?.amountFunded
			if (funded === null || funded === undefined) return sum
			return sum + (typeof funded === 'number' ? funded : Number(funded) || 0)
		}, 0),
		totalReleased: contract.milestones.reduce((sum, m) => {
			const released = m.escrow?.amountReleased
			if (released === null || released === undefined) return sum
			return sum + (typeof released === 'number' ? released : Number(released) || 0)
		}, 0),
		totalRefunded: contract.milestones.reduce((sum, m) => {
			const refunded = m.escrow?.amountRefunded
			if (refunded === null || refunded === undefined) return sum
			return sum + (typeof refunded === 'number' ? refunded : Number(refunded) || 0)
		}, 0),
		currency: contract.currency || 'USD'
	}

	return {
		...contract,
		milestoneStats,
		financialStats
	}
}

export const getContractStats = async () => {
	const [
		totalContracts,
		activeContracts,
		completedContracts,
		cancelledContracts,
		draftContracts,
		pausedContracts
	] = await Promise.all([
		prismaClient.contract.count(),
		prismaClient.contract.count({ where: { status: ContractStatus.ACTIVE } }),
		prismaClient.contract.count({ where: { status: ContractStatus.COMPLETED } }),
		prismaClient.contract.count({ where: { status: ContractStatus.CANCELLED } }),
		prismaClient.contract.count({ where: { status: ContractStatus.DRAFT } }),
		prismaClient.contract.count({ where: { status: ContractStatus.PAUSED } })
	])

	// Get total value by summing all released escrow amounts
	const milestones = await prismaClient.milestone.findMany({
		where: { isDeleted: false },
		select: { 
			escrow: {
				select: { amountReleased: true }
			}
		}
	})
	
	const totalValue = milestones.reduce((sum, m) => {
		const released = m.escrow?.amountReleased
		if (released === null || released === undefined) return sum
		return sum + (typeof released === 'number' ? released : Number(released) || 0)
	}, 0)

	return {
		totalContracts,
		activeContracts,
		completedContracts,
		cancelledContracts,
		draftContracts,
		pausedContracts,
		totalValue
	}
}

export default {
	listContracts,
	getContractDetail,
	getContractStats
}
