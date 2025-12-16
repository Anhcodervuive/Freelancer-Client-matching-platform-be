import { z } from 'zod'
import { MediationEvidenceSourceType, MediationEvidenceStatus, MediationResponse } from '~/generated/prisma'

// Base schemas
export const MediationEvidenceItemInputSchema = z.object({
	label: z.string().min(1).max(255).optional(),
	description: z.string().max(2000).optional(),
	sourceType: z.enum(['MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL', 'DOCUMENT_UPLOAD', 'SCREENSHOT', 'CONTRACT_DOCUMENT']),
	sourceId: z.string().optional(),
	assetId: z.string().optional(),
	url: z.string().max(2048).optional(),
	fileName: z.string().max(500).optional(),
	fileSize: z.number().int().min(0).optional(),
	mimeType: z.string().max(100).optional(),
	displayOrder: z.number().int().min(0).default(0)
}).superRefine((data, ctx) => {
	// Validate based on source type
	if (data.sourceType === 'EXTERNAL_URL') {
		if (!data.url) {
			ctx.addIssue({
				code: 'custom',
				message: 'URL is required for external URL evidence',
				path: ['url']
			})
		} else {
			// Validate URL format only when provided for external URL
			try {
				new URL(data.url)
			} catch {
				ctx.addIssue({
					code: 'custom',
					message: 'Invalid URL format',
					path: ['url']
				})
			}
		}
	} else if (data.sourceType === 'DOCUMENT_UPLOAD' || data.sourceType === 'SCREENSHOT') {
		if (!data.fileName) {
			ctx.addIssue({
				code: 'custom',
				message: 'File name is required for file uploads',
				path: ['fileName']
			})
		}
		// Note: assetId is optional for mock uploads, will be required in production
	} else if (data.sourceType === 'MILESTONE_ATTACHMENT' || data.sourceType === 'CHAT_ATTACHMENT') {
		if (!data.sourceId) {
			ctx.addIssue({
				code: 'custom',
				message: 'Source ID is required for attachment evidence',
				path: ['sourceId']
			})
		}
	} else {
		// For other types, require at least one source
		if (!data.sourceId && !data.assetId && !data.url) {
			ctx.addIssue({
				code: 'custom',
				message: 'At least one source must be provided',
				path: ['sourceId']
			})
		}
	}
})

export const CreateMediationEvidenceSubmissionSchema = z.object({
	title: z.string().min(1).max(500).optional(),
	description: z.string().max(5000).optional(),
	items: z.array(MediationEvidenceItemInputSchema).min(1).max(50)
})

export const UpdateMediationEvidenceSubmissionSchema = z.object({
	title: z.string().min(1).max(500).optional(),
	description: z.string().max(5000).optional(),
	items: z.array(MediationEvidenceItemInputSchema).max(50).optional()
})

export const SubmitMediationEvidenceSchema = z.object({
	submissionId: z.string()
})

export const ReviewMediationEvidenceSchema = z.object({
	status: z.enum(['ACCEPTED', 'REJECTED']),
	reviewNotes: z.string().max(2000).optional()
})

export const AddMediationEvidenceCommentSchema = z.object({
	itemId: z.string().optional(), // null for submission-level comments
	content: z.string().min(1).max(2000)
})

export const MediationEvidenceQuerySchema = z.object({
	disputeId: z.string(),
	status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED']).optional(),
	submittedById: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
})

// Template schemas
export const CreateMediationEvidenceTemplateSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().max(2000).optional(),
	category: z.string().max(100).optional(),
	requiredEvidenceTypes: z.array(z.enum(['MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL', 'DOCUMENT_UPLOAD', 'SCREENSHOT', 'CONTRACT_DOCUMENT'])).optional(),
	suggestedItems: z.array(z.object({
		label: z.string(),
		description: z.string().optional(),
		sourceType: z.enum(['MILESTONE_ATTACHMENT', 'CHAT_ATTACHMENT', 'ASSET', 'EXTERNAL_URL', 'DOCUMENT_UPLOAD', 'SCREENSHOT', 'CONTRACT_DOCUMENT']),
		isRequired: z.boolean().default(false)
	})).optional(),
	instructions: z.string().max(5000).optional()
})

export const UpdateMediationEvidenceTemplateSchema = CreateMediationEvidenceTemplateSchema.partial()

// Response schemas for mediation proposals
export const RespondToMediationProposalSchema = z.object({
	response: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
	message: z.string().max(2000).optional()
})

export const CreateMediationProposalSchema = z.object({
	releaseAmount: z.number().min(0),
	refundAmount: z.number().min(0),
	reasoning: z.string().min(50).max(5000),
	responseDeadlineDays: z.number().int().min(1).max(30).default(7)
})

// Type exports
export type MediationEvidenceItemInput = z.infer<typeof MediationEvidenceItemInputSchema>
export type CreateMediationEvidenceSubmissionInput = z.infer<typeof CreateMediationEvidenceSubmissionSchema>
export type UpdateMediationEvidenceSubmissionInput = z.infer<typeof UpdateMediationEvidenceSubmissionSchema>
export type SubmitMediationEvidenceInput = z.infer<typeof SubmitMediationEvidenceSchema>
export type ReviewMediationEvidenceInput = z.infer<typeof ReviewMediationEvidenceSchema>
export type AddMediationEvidenceCommentInput = z.infer<typeof AddMediationEvidenceCommentSchema>
export type MediationEvidenceQuery = z.infer<typeof MediationEvidenceQuerySchema>
export type CreateMediationEvidenceTemplateInput = z.infer<typeof CreateMediationEvidenceTemplateSchema>
export type UpdateMediationEvidenceTemplateInput = z.infer<typeof UpdateMediationEvidenceTemplateSchema>
export type RespondToMediationProposalInput = z.infer<typeof RespondToMediationProposalSchema>
export type CreateMediationProposalInput = z.infer<typeof CreateMediationProposalSchema>