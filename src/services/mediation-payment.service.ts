import { Prisma, EscrowStatus, TransferStatus, RefundStatus } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import Stripe from 'stripe'

// Initialize Stripe lazily
const getStripe = () => {
	const apiKey = process.env.STRIPE_API_KEY
	if (!apiKey) {
		throw new Error('STRIPE_API_KEY environment variable is not set')
	}
	return new Stripe(apiKey, {
		apiVersion: '2025-08-27.basil'
	})
}

export interface ProcessMediationPaymentInput {
	proposalId: string
	releaseAmount: number
	refundAmount: number
	currency: string
}

export interface MediationPaymentResult {
	success: boolean
	transferId: string | undefined
	refundId: string | undefined
	errors: string[] | undefined
}

/**
 * Process payment when both parties accept mediation proposal
 */
const processMediationPayment = async (input: ProcessMediationPaymentInput): Promise<MediationPaymentResult> => {
	const { proposalId, releaseAmount, refundAmount, currency } = input
	
	// Get proposal with all necessary data
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId },
		include: {
			dispute: {
				include: {
					escrow: {
						include: {
							milestone: {
								include: {
									contract: {
										include: {
											client: {
												include: {
													profile: true
												}
											},
											freelancer: {
												include: {
													profile: true,
													connectAccount: true
												}
											}
										}
									}
								}
							},
							payments: {
								where: {
									status: 'SUCCEEDED'
								},
								orderBy: {
									createdAt: 'desc'
								},
								take: 1
							}
						}
					}
				}
			}
		}
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	const dispute = proposal.dispute
	const escrow = dispute.escrow
	const milestone = escrow.milestone
	const contract = milestone!.contract
	const freelancer = contract.freelancer
	const client = contract.client
	const payment = escrow.payments[0] // Latest successful payment

	if (!payment) {
		throw new BadRequestException('No successful payment found for this escrow', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const errors: string[] = []
	let transferId: string | undefined
	let refundId: string | undefined

	try {
		await prismaClient.$transaction(async (tx) => {
			// 1. Process transfer to freelancer if releaseAmount > 0
			if (releaseAmount > 0) {
				// Check if freelancer has Stripe Connect account
				if (!freelancer.connectAccount?.stripeAccountId) {
					errors.push('Freelancer does not have a Stripe Connect account')
					return
				}

				if (!freelancer.connectAccount.payoutsEnabled) {
					errors.push('Freelancer Stripe account is not enabled for payouts')
					return
				}

				try {
					// Create Stripe transfer to freelancer
					const stripe = getStripe()
					const transfer = await stripe.transfers.create({
						amount: Math.round(releaseAmount * 100), // Convert to cents
						currency: currency.toLowerCase(),
						destination: freelancer.connectAccount.stripeAccountId,
						description: `Mediation resolution - Release to freelancer for milestone ${milestone!.id}`,
						metadata: {
							disputeId: dispute.id,
							proposalId: proposal.id,
							milestoneId: milestone!.id,
							contractId: contract.id,
							type: 'mediation_release'
						}
					})

					// Save transfer record
					const transferRecord = await tx.transfer.create({
						data: {
							escrowId: escrow.id,
							amount: new Prisma.Decimal(releaseAmount),
							currency,
							status: TransferStatus.SUCCEEDED,
							transferId: transfer.id,
							destinationAccountId: freelancer.connectAccount.stripeAccountId,
							idemKey: `mediation-${proposalId}-transfer`
						}
					})

					transferId = transferRecord.id

					// Update escrow amounts
					await tx.escrow.update({
						where: { id: escrow.id },
						data: {
							amountReleased: {
								increment: new Prisma.Decimal(releaseAmount)
							}
						}
					})

				} catch (stripeError: any) {
					console.error('Stripe transfer error:', stripeError)
					errors.push(`Transfer failed: ${stripeError.message}`)
				}
			}

			// 2. Process refund to client if refundAmount > 0
			if (refundAmount > 0) {
				try {
					// Create Stripe refund
					const stripe = getStripe()
					const refund = await stripe.refunds.create({
						payment_intent: payment.paymentIntentId,
						amount: Math.round(refundAmount * 100), // Convert to cents
						reason: 'requested_by_customer',
						metadata: {
							disputeId: dispute.id,
							proposalId: proposal.id,
							milestoneId: milestone!.id,
							contractId: contract.id,
							type: 'mediation_refund'
						}
					})

					// Save refund record
					const refundRecord = await tx.refund.create({
						data: {
							escrowId: escrow.id,
							paymentId: payment.id,
							amount: new Prisma.Decimal(refundAmount),
							currency,
							status: RefundStatus.SUCCEEDED,
							stripeRefundId: refund.id,
							idemKey: `mediation-${proposalId}-refund`
						}
					})

					refundId = refundRecord.id

					// Update escrow amounts
					await tx.escrow.update({
						where: { id: escrow.id },
						data: {
							amountRefunded: {
								increment: new Prisma.Decimal(refundAmount)
							}
						}
					})

				} catch (stripeError: any) {
					console.error('Stripe refund error:', stripeError)
					errors.push(`Refund failed: ${stripeError.message}`)
				}
			}

			// 3. Update escrow status based on results
			if (errors.length === 0) {
				const totalProcessed = releaseAmount + refundAmount
				const escrowAmount = Number(escrow.amountFunded)
				
				let newStatus: EscrowStatus
				if (totalProcessed >= escrowAmount) {
					// All money has been distributed
					if (releaseAmount > 0 && refundAmount > 0) {
						newStatus = EscrowStatus.PARTIALLY_RELEASED // Both release and refund
					} else if (releaseAmount > 0) {
						newStatus = EscrowStatus.RELEASED // Only release
					} else {
						newStatus = EscrowStatus.REFUNDED // Only refund
					}
				} else {
					// Partial distribution (platform keeps the rest as fee)
					newStatus = EscrowStatus.PARTIALLY_RELEASED
				}

				await tx.escrow.update({
					where: { id: escrow.id },
					data: {
						status: newStatus
					}
				})

				// Update milestone status if fully released
				if (releaseAmount > 0 && releaseAmount >= escrowAmount * 0.8) {
					await tx.milestone.update({
						where: { id: milestone!.id },
						data: {
							status: 'RELEASED',
							releasedAt: new Date()
						}
					})
				}
			}
		})

		// Return result
		return {
			success: errors.length === 0,
			transferId,
			refundId,
			errors: errors.length > 0 ? errors : undefined
		}

	} catch (error: any) {
		console.error('Mediation payment processing error:', error)
		return {
			success: false,
			transferId: undefined,
			refundId: undefined,
			errors: [`Payment processing failed: ${error.message}`]
		}
	}
}

/**
 * Get payment status for a mediation proposal
 */
const getMediationPaymentStatus = async (proposalId: string) => {
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId },
		include: {
			dispute: {
				include: {
					escrow: {
						include: {
							transfers: {
								orderBy: { createdAt: 'desc' }
							},
							refunds: {
								orderBy: { createdAt: 'desc' }
							}
						}
					}
				}
			}
		}
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	const escrow = proposal.dispute.escrow
	
	return {
		proposalId,
		escrowStatus: escrow.status,
		amountFunded: Number(escrow.amountFunded),
		amountReleased: Number(escrow.amountReleased),
		amountRefunded: Number(escrow.amountRefunded),
		currency: escrow.currency,
		transfers: escrow.transfers.map(transfer => ({
			id: transfer.id,
			amount: Number(transfer.amount),
			status: transfer.status,
			transferId: transfer.transferId,
			createdAt: transfer.createdAt.toISOString()
		})),
		refunds: escrow.refunds.map(refund => ({
			id: refund.id,
			amount: Number(refund.amount),
			status: refund.status,
			stripeRefundId: refund.stripeRefundId,
			createdAt: refund.createdAt.toISOString()
		}))
	}
}

/**
 * Retry failed mediation payment
 */
const retryMediationPayment = async (proposalId: string) => {
	const proposal = await prismaClient.mediationProposal.findUnique({
		where: { id: proposalId }
	})

	if (!proposal) {
		throw new NotFoundException('Mediation proposal not found', ErrorCode.ITEM_NOT_FOUND)
	}

	if (proposal.status !== 'ACCEPTED_BY_ALL') {
		throw new BadRequestException('Can only retry payment for accepted proposals', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	return processMediationPayment({
		proposalId,
		releaseAmount: Number(proposal.releaseAmount),
		refundAmount: Number(proposal.refundAmount),
		currency: 'USD' // TODO: Get from escrow
	})
}

// Export service
const mediationPaymentService = {
	processMediationPayment,
	getMediationPaymentStatus,
	retryMediationPayment
}

export default mediationPaymentService