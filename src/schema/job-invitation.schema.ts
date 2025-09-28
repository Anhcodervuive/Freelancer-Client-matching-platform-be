import { z } from 'zod'

import { JobInvitationStatus } from '~/generated/prisma'

const parseFilterArray = (value: unknown) => {
	if (value === undefined || value === null) return undefined
	const raw = Array.isArray(value) ? value : [value]
	const normalized = raw.flatMap(item =>
		String(item)
			.split(',')
			.map(part => part.trim())
			.filter(Boolean)
	)
	return normalized.length > 0 ? normalized : undefined
}

const parseBoolean = (value: unknown) => {
	if (value === undefined || value === null) return undefined
	if (typeof value === 'boolean') return value
	const normalized = String(value).trim().toLowerCase()
	if (['true', '1', 'yes'].includes(normalized)) return true
	if (['false', '0', 'no'].includes(normalized)) return false
	return undefined
}

export const CreateJobInvitationSchema = z
	.object({
		jobId: z.string().min(1),
		freelancerId: z.string().min(1),
		message: z.string().trim().max(5000).optional(),
		expiresAt: z.coerce.date().optional()
	})
	.superRefine((data, ctx) => {
		if (data.expiresAt && data.expiresAt.getTime() <= Date.now()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'expiresAt phải ở tương lai',
				path: ['expiresAt']
			})
		}
	})

export type CreateJobInvitationInput = z.infer<typeof CreateJobInvitationSchema>

const JobInvitationStatusEnum = z.nativeEnum(JobInvitationStatus)

const StatusArraySchema = z.array(JobInvitationStatusEnum).optional()

export const JobInvitationFilterSchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		jobId: z.string().min(1).optional(),
		freelancerId: z.string().min(1).optional(),
		status: JobInvitationStatusEnum.optional(),
		statuses: z.preprocess(parseFilterArray, StatusArraySchema).optional(),
		search: z.string().trim().min(1).optional(),
		sentFrom: z.coerce.date().optional(),
		sentTo: z.coerce.date().optional(),
		respondedFrom: z.coerce.date().optional(),
		respondedTo: z.coerce.date().optional(),
		includeExpired: z.preprocess(parseBoolean, z.boolean().optional()).optional(),
		sortBy: z.enum(['newest', 'oldest', 'responded-latest', 'responded-earliest']).optional()
	})
	.superRefine((data, ctx) => {
		if (data.sentFrom && data.sentTo && data.sentFrom > data.sentTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'sentFrom phải nhỏ hơn hoặc bằng sentTo',
				path: ['sentFrom']
			})
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'sentTo phải lớn hơn hoặc bằng sentFrom',
				path: ['sentTo']
			})
		}

		if (data.respondedFrom && data.respondedTo && data.respondedFrom > data.respondedTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'respondedFrom phải nhỏ hơn hoặc bằng respondedTo',
				path: ['respondedFrom']
			})
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'respondedTo phải lớn hơn hoặc bằng respondedFrom',
				path: ['respondedTo']
			})
		}
	})

export type JobInvitationFilterInput = z.infer<typeof JobInvitationFilterSchema>

export const RespondJobInvitationSchema = z.object({
	status: z.enum(['ACCEPTED', 'DECLINED'])
})

export type RespondJobInvitationInput = z.infer<typeof RespondJobInvitationSchema>
