import { Prisma, Role, MediationEvidenceStatus } from '~/generated/prisma'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'
import type {
	CreateMediationEvidenceSubmissionInput,
	UpdateMediationEvidenceSubmissionInput,
	ReviewMediationEvidenceInput,
	AddMediationEvidenceCommentInput,
	MediationEvidenceQuery
} from '~/schema/mediation-evidence.schema'

// MediationEvidenceStatus is now imported from Prisma generated types

// Include objects for queries
const mediationEvidenceSubmissionInclude = {
	submittedBy: {
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
	reviewedBy: {
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
	items: {
		include: {
			asset: {
				select: {
					id: true,
					url: true,
					mimeType: true,
					bytes: true,
					width: true,
					height: true
				}
			}
		},
		orderBy: {
			displayOrder: 'asc' as const
		}
	},
	comments: {
		include: {
			author: {
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
			item: {
				select: {
					id: true,
					label: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc' as const
		}
	}
} satisfies Prisma.MediationEvidenceSubmissionInclude
// Type definitions
type MediationEvidenceSubmissionPayload = Prisma.MediationEvidenceSubmissionGetPayload<{
	include: typeof mediationEvidenceSubmissionInclude
}>

// Helper functions
const ensureDisputeAccess = async (disputeId: string, userId: string, userRole: Role) => {
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

	if (!dispute.escrow.milestone) {
		throw new NotFoundException('Milestone not found for dispute', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access permissions
	const contract = dispute.escrow.milestone.contract
	const isParticipant = contract.clientId === userId || contract.freelancerId === userId
	const isAdmin = userRole === Role.ADMIN

	if (!isParticipant && !isAdmin) {
		throw new ForbiddenException('Access denied to this dispute', ErrorCode.FORBIDDEN)
	}

	return dispute
}

const serializeMediationEvidenceSubmission = (submission: MediationEvidenceSubmissionPayload) => {
	return {
		id: submission.id,
		disputeId: submission.disputeId,
		status: submission.status,
		title: submission.title,
		description: submission.description,
		submissionDeadline: submission.submissionDeadline?.toISOString() || null,
		submittedAt: submission.submittedAt?.toISOString() || null,
		reviewedAt: submission.reviewedAt?.toISOString() || null,
		reviewNotes: submission.reviewNotes,
		createdAt: submission.createdAt.toISOString(),
		updatedAt: submission.updatedAt.toISOString(),
		submittedBy: {
			id: submission.submittedBy.id,
			email: submission.submittedBy.email,
			role: submission.submittedBy.role,
			firstName: submission.submittedBy.profile?.firstName || null,
			lastName: submission.submittedBy.profile?.lastName || null
		},
		reviewedBy: submission.reviewedBy ? {
			id: submission.reviewedBy.id,
			email: submission.reviewedBy.email,
			role: submission.reviewedBy.role,
			firstName: submission.reviewedBy.profile?.firstName || null,
			lastName: submission.reviewedBy.profile?.lastName || null
		} : null,
		items: submission.items.map(item => ({
			id: item.id,
			label: item.label,
			description: item.description,
			sourceType: item.sourceType,
			sourceId: item.sourceId,
			url: item.url,
			fileName: item.fileName,
			fileSize: item.fileSize ? Number(item.fileSize) : null,
			mimeType: item.mimeType,
			displayOrder: item.displayOrder,
			createdAt: item.createdAt.toISOString(),
			asset: item.asset ? {
				id: item.asset.id,
				url: item.asset.url,
				mimeType: item.asset.mimeType,
				bytes: item.asset.bytes,
				width: item.asset.width,
				height: item.asset.height
			} : null
		})),
		comments: submission.comments.map(comment => ({
			id: comment.id,
			content: comment.content,
			authorRole: comment.authorRole,
			createdAt: comment.createdAt.toISOString(),
			author: {
				id: comment.author.id,
				email: comment.author.email,
				role: comment.author.role,
				firstName: comment.author.profile?.firstName || null,
				lastName: comment.author.profile?.lastName || null
			},
			item: comment.item ? {
				id: comment.item.id,
				label: comment.item.label
			} : null
		}))
	}
}
// Service functions
const createMediationEvidenceSubmission = async (
	disputeId: string,
	userId: string,
	userRole: Role,
	input: CreateMediationEvidenceSubmissionInput
) => {
	console.log('Creating mediation evidence submission:', { disputeId, userId, userRole, input })
	
	// Ensure user has access to dispute
	await ensureDisputeAccess(disputeId, userId, userRole)

	// Check if user already has a submission for this dispute
	const existingSubmission = await prismaClient.mediationEvidenceSubmission.findFirst({
		where: {
			disputeId,
			submittedById: userId
		}
	})

	if (existingSubmission) {
		console.log('User already has submission, updating instead of creating new one')
		// Update existing submission instead of creating new one
		return await updateMediationEvidenceSubmission(existingSubmission.id, userId, userRole, input)
	}

	// Create submission with items
	try {
		console.log('Creating submission with data:', {
			disputeId,
			submittedById: userId,
			title: input.title || null,
			description: input.description || null,
			status: MediationEvidenceStatus.DRAFT,
			itemsCount: input.items.length
		})
		
		const submission = await prismaClient.mediationEvidenceSubmission.create({
			data: {
				disputeId,
				submittedById: userId,
				title: input.title || null,
				description: input.description || null,
				status: MediationEvidenceStatus.DRAFT,
				items: {
					create: input.items.map((item, index) => ({
						label: item.label || null,
						description: item.description || null,
						sourceType: item.sourceType,
						sourceId: item.sourceId || null,
						assetId: item.assetId || null,
						url: item.url || null,
						fileName: item.fileName || null,
						fileSize: item.fileSize ? BigInt(item.fileSize) : null,
						mimeType: item.mimeType || null,
						displayOrder: item.displayOrder !== undefined ? item.displayOrder : index
					}))
				}
			},
			include: mediationEvidenceSubmissionInclude
		})

		return serializeMediationEvidenceSubmission(submission)
	} catch (error) {
		console.error('Error creating mediation evidence submission:', error)
		throw error
	}
}

const updateMediationEvidenceSubmission = async (
	submissionId: string,
	userId: string,
	userRole: Role,
	input: UpdateMediationEvidenceSubmissionInput
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId },
		include: { dispute: true }
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access
	await ensureDisputeAccess(submission.disputeId, userId, userRole)

	// Only allow updates by the submitter and only if status is DRAFT
	if (submission.submittedById !== userId) {
		throw new ForbiddenException('Only the submitter can update this evidence', ErrorCode.FORBIDDEN)
	}

	if (submission.status !== MediationEvidenceStatus.DRAFT) {
		throw new BadRequestException('Can only update draft submissions', ErrorCode.FORBIDDEN)
	}

	// Update submission
	const updatedSubmission = await prismaClient.$transaction(async (tx) => {
		// Update basic info
		const updated = await tx.mediationEvidenceSubmission.update({
			where: { id: submissionId },
			data: {
				title: input.title || null,
				description: input.description || null
			}
		})

		// Update items if provided
		if (input.items) {
			// Delete existing items
			await tx.mediationEvidenceItem.deleteMany({
				where: { submissionId }
			})

			// Create new items
			await tx.mediationEvidenceItem.createMany({
				data: input.items.map((item, index) => ({
					submissionId,
					label: item.label || null,
					description: item.description || null,
					sourceType: item.sourceType,
					sourceId: item.sourceId || null,
					assetId: item.assetId || null,
					url: item.url || null,
					fileName: item.fileName || null,
					displayOrder: item.displayOrder ?? index
				}))
			})
		}

		return updated
	})

	// Fetch updated submission with includes
	const finalSubmission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId },
		include: mediationEvidenceSubmissionInclude
	})

	return serializeMediationEvidenceSubmission(finalSubmission!)
}
const submitMediationEvidence = async (
	submissionId: string,
	userId: string,
	userRole: Role
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId },
		include: { items: true }
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access
	await ensureDisputeAccess(submission.disputeId, userId, userRole)

	// Only allow submission by the submitter and only if status is DRAFT
	if (submission.submittedById !== userId) {
		throw new ForbiddenException('Only the submitter can submit this evidence', ErrorCode.FORBIDDEN)
	}

	if (submission.status !== MediationEvidenceStatus.DRAFT) {
		throw new BadRequestException('Evidence is not in draft status', ErrorCode.FORBIDDEN)
	}

	// Must have at least one evidence item
	if (submission.items.length === 0) {
		throw new BadRequestException('Cannot submit evidence without any items', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	// Update status to SUBMITTED
	const updatedSubmission = await prismaClient.mediationEvidenceSubmission.update({
		where: { id: submissionId },
		data: {
			status: MediationEvidenceStatus.SUBMITTED,
			submittedAt: new Date()
		},
		include: mediationEvidenceSubmissionInclude
	})

	return serializeMediationEvidenceSubmission(updatedSubmission)
}

const reviewMediationEvidence = async (
	submissionId: string,
	reviewerId: string,
	input: ReviewMediationEvidenceInput
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId }
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	if (submission.status !== MediationEvidenceStatus.SUBMITTED) {
		throw new BadRequestException('Can only review submitted evidence', ErrorCode.FORBIDDEN)
	}

	const newStatus = input.status === 'ACCEPTED' 
		? MediationEvidenceStatus.ACCEPTED 
		: MediationEvidenceStatus.REJECTED

	const updatedSubmission = await prismaClient.mediationEvidenceSubmission.update({
		where: { id: submissionId },
		data: {
			status: newStatus,
			reviewedAt: new Date(),
			reviewedById: reviewerId,
			reviewNotes: input.reviewNotes || null
		},
		include: mediationEvidenceSubmissionInclude
	})

	return serializeMediationEvidenceSubmission(updatedSubmission)
}

const addMediationEvidenceComment = async (
	submissionId: string,
	userId: string,
	userRole: Role,
	input: AddMediationEvidenceCommentInput
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId }
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access
	await ensureDisputeAccess(submission.disputeId, userId, userRole)

	// If itemId is provided, verify it belongs to this submission
	if (input.itemId) {
		const item = await prismaClient.mediationEvidenceItem.findFirst({
			where: {
				id: input.itemId,
				submissionId
			}
		})

		if (!item) {
			throw new NotFoundException('Evidence item not found in this submission', ErrorCode.ITEM_NOT_FOUND)
		}
	}

	const comment = await prismaClient.mediationEvidenceComment.create({
		data: {
			submissionId,
			itemId: input.itemId || null,
			authorId: userId,
			authorRole: userRole,
			content: input.content
		},
		include: {
			author: {
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
			item: {
				select: {
					id: true,
					label: true
				}
			}
		}
	})

	return {
		id: comment.id,
		content: comment.content,
		authorRole: comment.authorRole,
		createdAt: comment.createdAt.toISOString(),
		author: {
			id: comment.author.id,
			email: comment.author.email,
			role: comment.author.role,
			firstName: comment.author.profile?.firstName || null,
			lastName: comment.author.profile?.lastName || null
		},
		item: comment.item ? {
			id: comment.item.id,
			label: comment.item.label
		} : null
	}
}
const getMediationEvidenceSubmission = async (
	submissionId: string,
	userId: string,
	userRole: Role
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId },
		include: mediationEvidenceSubmissionInclude
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access
	await ensureDisputeAccess(submission.disputeId, userId, userRole)

	return serializeMediationEvidenceSubmission(submission)
}

const listMediationEvidenceSubmissions = async (
	query: MediationEvidenceQuery,
	userId: string,
	userRole: Role
) => {
	// Check access to dispute
	await ensureDisputeAccess(query.disputeId, userId, userRole)

	const where: Prisma.MediationEvidenceSubmissionWhereInput = {
		disputeId: query.disputeId
	}

	if (query.status) {
		where.status = query.status
	}

	if (query.submittedById) {
		where.submittedById = query.submittedById
	}

	const [submissions, total] = await prismaClient.$transaction([
		prismaClient.mediationEvidenceSubmission.findMany({
			where,
			include: mediationEvidenceSubmissionInclude,
			orderBy: { createdAt: 'desc' },
			skip: (query.page - 1) * query.limit,
			take: query.limit
		}),
		prismaClient.mediationEvidenceSubmission.count({ where })
	])

	return {
		data: submissions.map(serializeMediationEvidenceSubmission),
		meta: {
			page: query.page,
			limit: query.limit,
			total
		}
	}
}

const deleteMediationEvidenceSubmission = async (
	submissionId: string,
	userId: string,
	userRole: Role
) => {
	const submission = await prismaClient.mediationEvidenceSubmission.findUnique({
		where: { id: submissionId }
	})

	if (!submission) {
		throw new NotFoundException('Evidence submission not found', ErrorCode.ITEM_NOT_FOUND)
	}

	// Check access
	await ensureDisputeAccess(submission.disputeId, userId, userRole)

	// Only allow deletion by the submitter and only if status is DRAFT
	if (submission.submittedById !== userId && userRole !== Role.ADMIN) {
		throw new ForbiddenException('Only the submitter or admin can delete this evidence', ErrorCode.FORBIDDEN)
	}

	if (submission.status !== MediationEvidenceStatus.DRAFT && userRole !== Role.ADMIN) {
		throw new BadRequestException('Can only delete draft submissions', ErrorCode.FORBIDDEN)
	}

	await prismaClient.mediationEvidenceSubmission.delete({
		where: { id: submissionId }
	})

	return { success: true }
}

// Export service
const mediationEvidenceService = {
	createMediationEvidenceSubmission,
	updateMediationEvidenceSubmission,
	submitMediationEvidence,
	reviewMediationEvidence,
	addMediationEvidenceComment,
	getMediationEvidenceSubmission,
	listMediationEvidenceSubmissions,
	deleteMediationEvidenceSubmission
}

export default mediationEvidenceService