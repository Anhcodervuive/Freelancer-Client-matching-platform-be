import { Prisma, Role, DisputeStatus, EscrowStatus } from '~/generated/prisma'

// Temporary enums until Prisma migration is run
enum MediationProposalStatus {
	PENDING = 'PENDING',
	ACCEPTED_BY_ALL = 'ACCEPTED_BY_ALL',
	REJECTED = 'REJECTED',
	EXPIRED = 'EXPIRED'
}

enum MediationResponse {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED'
}
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import type {
	CreateMediationProposalInput,
	RespondToMediationProposalInput
} from '~/schema/mediation-evidence.schema'

// Include object for queries
const mediationProposalInclude = {
	proposedBy: {
		select: {
			id: true,
			email: true,
			role: true,
			profile: {
				select: {
					firstName: true,
					lastName: true
				}
			}
		}
	},
	dispute: {
		include: {
			escrow: {
				include: {
					milestone: {
						include: {
							contract: {
								select: {
									id: true,
									clientId: true,
									freelancerId: true,
									client: {
										select: {
											userId: true,
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
					}
				}
			}
		}
	}
} satisfies Prisma.MediationProposalInclude

type MediationProposalPayload = Prisma.MediationProposalGetPayload<{
	include: typeof mediationProposalInclude
}>

// Helper functions
const ensureAdminJoinedDispute = async (disputeId: string, adminId: string) => {
	// Check if admin has joined the dispute chat
	const dispute = await prismaClient.dispute.findUnique({
		where: { id: disputeId },
		include: {
			escrow: {
				include: {
					milestone: {
						include: {
							contract: {
								include: {
									chatThreads: {
										include: {
											participants: {
												where: {
													userId: adminId
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	})

	if (!dispute) {
		throw new NotFoundException('Dispute not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check if dispute is in correct status for mediation
	if (dispute.status !== DisputeStatus.INTERNAL_MEDIATION) {
		throw new BadRequestException(
			'Dispute must be in INTERNAL_MEDIATION status to create proposals',
			ErrorCode.UNPROCESSABLE_ENTITY
		)
	}

	// Check if admin has joined any chat thread for this contract
	const milestone = dispute.escrow.milestone
	if (!milestone) {
		throw new BadRequestException('Dispute milestone not found', ErrorCode.ITEM_NOT_FOUND)
	}

	const chatThreads = milestone.contract.chatThreads
	const adminJoinedChat = chatThreads.some(thread => thread.participants.length > 0)
	
	if (!adminJoinedChat) {
		throw new ForbiddenException(
			'Admin must join the dispute chat before creating mediation proposals',
			ErrorCode.FORBIDDEN
		)
	}

	return dispute
}

const serializeMediationProposal = (proposal: MediationProposalPayload) => {
	const milestone = proposal.dispute.escrow.milestone
	if (!milestone) {
		throw new Error('Milestone not found for dispute')
	}
	
	const contract = milestone.contract
	
	return {
		id: proposal.id,
		disputeId: proposal.disputeId,
		status: proposal.status,
		releaseAmount: Number(proposal.releaseAmount),
		refundAmount: Number(proposal.refundAmount),
		reasoning: proposal.reasoning,
		responseDeadline: proposal.responseDeadline.toISOString(),
		clientResponse: proposal.clientResponse,
		freelancerResponse: proposal.freelancerResponse,
		clientRespondedAt: proposal.clientRespondedAt?.toISOString() || null,
		freelancerRespondedAt: proposal.freelancerRespondedAt?.toISOString() || null,
		clientResponseMessage: proposal.clientResponseMessage,
		freelancerResponseMessage: proposal.freelancerResponseMessage,
		createdAt: proposal.createdAt.toISOString(),
		updatedAt: proposal.updatedAt.toISOString(),
		proposedBy: {
			id: proposal.proposedBy.id,
			email: proposal.proposedBy.email,
			role: proposal.proposedBy.role,
			firstName: proposal.proposedBy.profile?.firstName || null,
			lastName: proposal.proposedBy.profile?.lastName || null
		},
		contract: {
			id: contract.id,
			clientId: contract.clientId,
			freelancerId: contract.freelancerId,
			client: {
				userId: contract.client.userId,
				firstName: contract.client.profile?.firstName || null,
				lastName: contract.client.profile?.lastName || null
			},
			freelancer: {
				userId: contract.freelancer.userId,
				firstName: contract.freelancer.profile?.firstName || null,
				lastName: contract.freelancer.profile?.lastName || null
			}
		},
		escrowAmount: Number(proposal.dispute.escrow.amountFunded),
		currency: proposal.dispute.escrow.currency
	}
}
// Service functions
const createMediationProposal = async (
	disputeId: string,
	adminId: string,
	input: CreateMediationProposalInput
) => {
	// Ensure admin has joined dispute and dispute is in correct status
	const dispute = await ensureAdminJoinedDispute(disputeId, adminId)
	
	// Check if there's already an active proposal
	const existingProposal = await prismaClient.mediationProposal.findFirst({
		where: {
			disputeId,
			status: MediationProposalStatus.PENDING
		}
	})

	if (existingProposal) {
		throw new BadRequestException(
			'There is already an active mediation proposal for this dispute',
			ErrorCode.UNPROCESSABLE_ENTITY
		)
	}

	// Validate amounts
	const escrowAmount = Number(dispute.escrow.amountFunded)
	const totalProposed = input.releaseAmount + input.refundAmount
	
	if (totalProposed > escrowAmount) {
		throw new BadRequestException(
			`Total proposed amount (${totalProposed}) cannot exceed escrow amount (${escrowAmount})`,
			ErrorCode.UNPROCESSABLE_ENTITY
		)
	}

	// Calculate response deadline
	const responseDeadline = new Date()
	responseDeadline.setDate(responseDeadline.getDate() + (input.responseDeadlineDays || 7))

	// Create proposal
	const proposal = await prismaClient.mediationProposal.create({
		data: {
			disputeId,
			proposedById: adminId,
			releaseAmount: new Prisma.Decimal(input.releaseAmount),
			refundAmount: new Prisma.Decimal(input.refundAmount),
			reasoning: input.reasoning,
			responseDeadline,
			status: MediationProposalStatus.PENDING
		},
		include: mediationProposalInclude
	})

	// Update dispute status if needed
	await prismaClient.dispute.update({
		where: { id: disputeId },
		data: {
			responseDeadline: responseDeadline
		}
	})

	// TODO: Send notifications to client and freelancer
	// await sendMediationProposalNotifications(proposal)

	return serializeMediationProposal(proposal)
}

const respondToMediationProposal = async (
	proposalId: string,
	userId: string,
	userRole: Role,
	input: RespondToMediationProposalInput
) => {
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId },
		include: mediationProposalInclude
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	if (proposal.status !== MediationProposalStatus.PENDING) {
		throw new BadRequestException('Proposal is not in pending status', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	// Check if user is participant in the dispute
	const milestone = proposal.dispute.escrow.milestone
	if (!milestone) {
		throw new BadRequestException('Milestone not found for dispute', ErrorCode.ITEM_NOT_FOUND)
	}
	
	const contract = milestone.contract
	const isClient = contract.clientId === userId
	const isFreelancer = contract.freelancerId === userId

	if (!isClient && !isFreelancer) {
		throw new ForbiddenException('Only dispute participants can respond to proposals', ErrorCode.FORBIDDEN)
	}

	// Check if user has already responded
	if (isClient && proposal.clientResponse !== MediationResponse.PENDING) {
		throw new BadRequestException('Client has already responded to this proposal', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	if (isFreelancer && proposal.freelancerResponse !== MediationResponse.PENDING) {
		throw new BadRequestException('Freelancer has already responded to this proposal', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	// Update response
	const updateData: Prisma.MediationProposalUpdateInput = {}
	
	if (isClient) {
		updateData.clientResponse = input.response
		updateData.clientRespondedAt = new Date()
		updateData.clientResponseMessage = input.message || null
	} else {
		updateData.freelancerResponse = input.response
		updateData.freelancerRespondedAt = new Date()
		updateData.freelancerResponseMessage = input.message || null
	}

	// Check if both parties have now responded
	const otherResponse = isClient ? proposal.freelancerResponse : proposal.clientResponse
	const currentResponse = input.response

	if (otherResponse !== MediationResponse.PENDING) {
		// Both have responded, determine final status
		if (otherResponse === MediationResponse.ACCEPTED && currentResponse === MediationResponse.ACCEPTED) {
			updateData.status = MediationProposalStatus.ACCEPTED_BY_ALL
		} else {
			updateData.status = MediationProposalStatus.REJECTED
		}
	}

	const updatedProposal = await prismaClient.$transaction(async (tx) => {
		const updated = await tx.mediationProposal.update({
			where: { id: proposalId },
			data: updateData,
			include: mediationProposalInclude
		})

		// If both parties accepted, process the mediation success
		if (updated.status === MediationProposalStatus.ACCEPTED_BY_ALL) {
			// Process mediation success inline to avoid type issues
			const disputeId = updated.disputeId
			const escrowId = updated.dispute.escrowId
			
			// Update dispute status
			await tx.dispute.update({
				where: { id: disputeId },
				data: {
					status: DisputeStatus.RESOLVED_SPLIT,
					decidedRelease: updated.releaseAmount,
					decidedRefund: updated.refundAmount,
					decidedAt: new Date(),
					decidedById: updated.proposedById,
					decisionSummary: `Mediation agreement: Release ${updated.releaseAmount}, Refund ${updated.refundAmount}`
				}
			})

			// Update escrow status
			await tx.escrow.update({
				where: { id: escrowId },
				data: {
					status: EscrowStatus.DISPUTED // Keep as disputed until payments are processed
				}
			})
		}

		return updated
	})

	// TODO: Send notifications
	// await sendMediationResponseNotifications(updatedProposal, userId, input.response)

	return serializeMediationProposal(updatedProposal)
}


const getMediationProposal = async (proposalId: string, userId: string, userRole: Role) => {
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId },
		include: mediationProposalInclude
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access permissions
	const milestone = proposal.dispute.escrow.milestone
	if (!milestone) {
		throw new BadRequestException('Milestone not found for dispute', ErrorCode.ITEM_NOT_FOUND)
	}
	
	const contract = milestone.contract
	const isParticipant = contract.clientId === userId || contract.freelancerId === userId
	const isAdmin = userRole === Role.ADMIN

	if (!isParticipant && !isAdmin) {
		throw new ForbiddenException('Access denied to this proposal', ErrorCode.FORBIDDEN)
	}

	return serializeMediationProposal(proposal)
}

const listMediationProposals = async (disputeId: string, userId: string, userRole: Role) => {
	// Check access to dispute first
	const dispute = await prismaClient.dispute.findUnique({
		where: { id: disputeId },
		include: {
			escrow: {
				include: {
					milestone: {
						include: {
							contract: {
								select: {
									clientId: true,
									freelancerId: true
								}
							}
						}
					}
				}
			}
		}
	})

	if (!dispute) {
		throw new NotFoundException('Dispute not found', ErrorCode.ITEM_NOT_FOUND)
	}

	const milestone = dispute.escrow.milestone
	if (!milestone) {
		throw new BadRequestException('Milestone not found for dispute', ErrorCode.ITEM_NOT_FOUND)
	}
	
	const contract = milestone.contract
	const isParticipant = contract.clientId === userId || contract.freelancerId === userId
	const isAdmin = userRole === Role.ADMIN

	if (!isParticipant && !isAdmin) {
		throw new ForbiddenException('Access denied to this dispute', ErrorCode.FORBIDDEN)
	}

	// Get proposals
	const proposals = await prismaClient.mediationProposal.findMany({
		where: { disputeId },
		include: mediationProposalInclude,
		orderBy: { createdAt: 'desc' }
	})

	return proposals.map(serializeMediationProposal)
}

const deleteMediationProposal = async (proposalId: string, adminId: string) => {
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId }
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	if (proposal.status !== MediationProposalStatus.PENDING) {
		throw new BadRequestException('Can only delete pending proposals', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	if (proposal.proposedById !== adminId) {
		throw new ForbiddenException('Only the proposer can delete this proposal', ErrorCode.FORBIDDEN)
	}

	await prismaClient.mediationProposal.delete({
		where: { id: proposalId }
	})

	return { success: true }
}

// Export service
const mediationProposalService = {
	createMediationProposal,
	respondToMediationProposal,
	getMediationProposal,
	listMediationProposals,
	deleteMediationProposal
}

export default mediationProposalService