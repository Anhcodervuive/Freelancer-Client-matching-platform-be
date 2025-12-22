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

// ============================================================================
// CONTRACT PAYMENT DETAILS
// ============================================================================

export const getContractPaymentDetails = async (contractId: string) => {
	const contract = await prismaClient.contract.findUnique({
		where: { id: contractId },
		select: {
			id: true,
			title: true,
			currency: true,
			status: true,
			createdAt: true,
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
					},
					connectAccount: {
						select: {
							stripeAccountId: true,
							payoutsEnabled: true
						}
					}
				}
			},
			milestones: {
				where: { isDeleted: false },
				select: {
					id: true,
					title: true,
					amount: true,
					currency: true,
					status: true,
					createdAt: true,
					approvedAt: true,
					releasedAt: true,
					escrow: {
						select: {
							id: true,
							status: true,
							amountFunded: true,
							amountReleased: true,
							amountRefunded: true,
							platformFeeTotal: true,
							processingFeeTotal: true,
							currency: true,
							createdAt: true,
							updatedAt: true,
							payments: {
								select: {
									id: true,
									amount: true,
									currency: true,
									status: true,
									type: true,
									cardBrand: true,
									cardLast4: true,
									createdAt: true
								},
								orderBy: { createdAt: 'desc' }
							},
							transfers: {
								select: {
									id: true,
									amount: true,
									currency: true,
									status: true,
									createdAt: true
								},
								orderBy: { createdAt: 'desc' }
							},
							refunds: {
								select: {
									id: true,
									amount: true,
									currency: true,
									status: true,
									createdAt: true
								},
								orderBy: { createdAt: 'desc' }
							}
						}
					}
				},
				orderBy: { createdAt: 'asc' }
			}
		}
	})

	if (!contract) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	// Calculate payment overview
	const currency = contract.currency || 'USD'
	
	let totalContractValue = 0
	let totalFunded = 0
	let totalReleased = 0
	let totalRefunded = 0
	let totalPlatformFee = 0
	let totalProcessingFee = 0

	// Build milestone payment breakdown
	const milestonePayments = contract.milestones.map(milestone => {
		const amount = Number(milestone.amount) || 0
		const funded = Number(milestone.escrow?.amountFunded) || 0
		const released = Number(milestone.escrow?.amountReleased) || 0
		const refunded = Number(milestone.escrow?.amountRefunded) || 0
		const platformFee = Number(milestone.escrow?.platformFeeTotal) || 0
		const processingFee = Number(milestone.escrow?.processingFeeTotal) || 0

		totalContractValue += amount
		totalFunded += funded
		totalReleased += released
		totalRefunded += refunded
		totalPlatformFee += platformFee
		totalProcessingFee += processingFee

		return {
			milestoneId: milestone.id,
			milestoneTitle: milestone.title,
			milestoneStatus: milestone.status,
			amount,
			currency: milestone.currency,
			escrowStatus: milestone.escrow?.status || 'UNFUNDED',
			funded,
			released,
			refunded,
			platformFee,
			processingFee,
			netToFreelancer: released - platformFee,
			approvedAt: milestone.approvedAt,
			releasedAt: milestone.releasedAt,
			payments: milestone.escrow?.payments || [],
			transfers: milestone.escrow?.transfers || [],
			refunds: milestone.escrow?.refunds || []
		}
	})

	// Build transaction history (all payments, transfers, refunds combined)
	type TransactionItem = {
		id: string
		type: 'PAYMENT' | 'TRANSFER' | 'REFUND'
		amount: number
		currency: string
		status: string
		description: string
		milestoneTitle: string
		cardInfo?: string | undefined
		createdAt: Date
	}
	
	const transactions: TransactionItem[] = []

	for (const milestone of contract.milestones) {
		const milestoneTitle = milestone.title

		// Add payments
		for (const payment of milestone.escrow?.payments || []) {
			const cardInfo = payment.cardBrand && payment.cardLast4 
				? `${payment.cardBrand} ****${payment.cardLast4}` 
				: null
			
			const baseTransaction = {
				id: payment.id,
				type: 'PAYMENT' as const,
				amount: Number(payment.amount),
				currency: payment.currency,
				status: String(payment.status),
				description: `Fund escrow cho "${milestoneTitle}"`,
				milestoneTitle,
				createdAt: payment.createdAt
			}
			
			if (cardInfo) {
				transactions.push({ ...baseTransaction, cardInfo })
			} else {
				transactions.push(baseTransaction)
			}
		}

		// Add transfers
		for (const transfer of milestone.escrow?.transfers || []) {
			transactions.push({
				id: transfer.id,
				type: 'TRANSFER' as const,
				amount: Number(transfer.amount),
				currency: transfer.currency,
				status: String(transfer.status),
				description: `Release payment cho "${milestoneTitle}"`,
				milestoneTitle,
				createdAt: transfer.createdAt
			})
		}

		// Add refunds
		for (const refund of milestone.escrow?.refunds || []) {
			transactions.push({
				id: refund.id,
				type: 'REFUND' as const,
				amount: Number(refund.amount),
				currency: refund.currency,
				status: String(refund.status),
				description: `Hoàn tiền cho "${milestoneTitle}"`,
				milestoneTitle,
				createdAt: refund.createdAt
			})
		}
	}

	// Sort transactions by date (newest first)
	transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

	return {
		contract: {
			id: contract.id,
			title: contract.title,
			status: contract.status,
			currency,
			createdAt: contract.createdAt,
			client: contract.client,
			freelancer: {
				...contract.freelancer,
				payoutsEnabled: contract.freelancer.connectAccount?.payoutsEnabled || false
			}
		},
		paymentOverview: {
			totalContractValue,
			totalFunded,
			totalReleased,
			totalRefunded,
			outstandingBalance: totalContractValue - totalFunded,
			inEscrow: totalFunded - totalReleased - totalRefunded,
			totalPlatformFee,
			totalProcessingFee,
			netToFreelancer: totalReleased - totalPlatformFee,
			currency
		},
		milestonePayments,
		transactions,
		summary: {
			totalMilestones: contract.milestones.length,
			fundedMilestones: contract.milestones.filter(m => 
				m.escrow && Number(m.escrow.amountFunded) > 0
			).length,
			releasedMilestones: contract.milestones.filter(m => 
				m.status === MilestoneStatus.RELEASED
			).length,
			pendingMilestones: contract.milestones.filter(m => 
				m.status === MilestoneStatus.OPEN || m.status === MilestoneStatus.SUBMITTED
			).length
		}
	}
}

export default {
	listContracts,
	getContractDetail,
	getContractStats,
	getContractPaymentDetails
}
