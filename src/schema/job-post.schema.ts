import { z } from 'zod'

import {
	JobDurationCommitment,
	JobExperienceLevel,
	JobLocationType,
	JobPaymentMode,
	JobPostFormVersion,
	JobStatus,
	JobVisibility,
	LanguageProficiency
} from '~/generated/prisma'

const preprocessBudget = (value: unknown) => {
	if (value === undefined) return undefined
	if (value === null) return null
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (trimmed === '') return undefined
		const parsed = Number(trimmed)
		return Number.isNaN(parsed) ? NaN : parsed
	}
	return value
}

const nullableBudgetSchema = z
	.preprocess(preprocessBudget, z.union([z.number().nonnegative(), z.null()]).optional())
	.refine(
		value => value === undefined || value === null || Number.isFinite(value as number),
		'Budget amount must be a valid number'
	)

const currencySchema = z
	.string()
	.trim()
	.length(3, 'Currency must have 3 characters')
	.transform(value => value.toUpperCase())

const locationEntrySchema = z.union([
	z.string().min(1),
	z.object({
		code: z.string().min(1),
		label: z.string().min(1)
	})
])

const languageRequirementSchema = z
	.object({
		languageCode: z
			.string()
			.min(2)
			.max(10)
			.transform(value => value.toUpperCase()),
		proficiency: z.nativeEnum(LanguageProficiency).default(LanguageProficiency.CONVERSATIONAL)
	})
	.strict()

const screeningQuestionSchema = z
	.object({
		question: z.string().min(5).max(500),
		isRequired: z.boolean().default(true)
	})
	.strict()

const jobPostSkillsSchema = z
	.object({
		required: z.array(z.string().min(1)).max(50).default([]),
		preferred: z.array(z.string().min(1)).max(50).default([])
	})
	.strict()

const attachmentsSchema = z.array(z.string().min(1)).max(20)

export const CreateJobPostSchema = z
	.object({
		specialtyId: z.string().min(1),
		title: z.string().min(5).max(255),
		description: z.string().min(20),
		paymentMode: z.nativeEnum(JobPaymentMode),
		formVersion: z.nativeEnum(JobPostFormVersion).default(JobPostFormVersion.VERSION_1),
		budgetAmount: nullableBudgetSchema,
		budgetCurrency: currencySchema.optional(),
		duration: z.nativeEnum(JobDurationCommitment).optional(),
		experienceLevel: z.nativeEnum(JobExperienceLevel),
		locationType: z.nativeEnum(JobLocationType).optional(),
		preferredLocations: z.array(locationEntrySchema).max(20).optional(),
		customTerms: z.record(z.string(), z.unknown()).optional(),
		visibility: z.nativeEnum(JobVisibility).optional(),
		status: z.nativeEnum(JobStatus).optional(),
		languages: z.array(languageRequirementSchema).default([]),
		skills: jobPostSkillsSchema.default({ required: [], preferred: [] }),
		screeningQuestions: z.array(screeningQuestionSchema).max(20).default([]),
		attachments: attachmentsSchema.optional()
	})
	.strict()

export const UpdateJobPostSchema = z
	.object({
		specialtyId: z.string().min(1).optional(),
		title: z.string().min(5).max(255).optional(),
		description: z.string().min(20).optional(),
		paymentMode: z.nativeEnum(JobPaymentMode).optional(),
		formVersion: z.nativeEnum(JobPostFormVersion).optional(),
		budgetAmount: nullableBudgetSchema,
		budgetCurrency: z.union([currencySchema, z.null()]).optional(),
		duration: z.union([z.nativeEnum(JobDurationCommitment), z.null()]).optional(),
		experienceLevel: z.nativeEnum(JobExperienceLevel).optional(),
		locationType: z.nativeEnum(JobLocationType).optional(),
		preferredLocations: z.union([z.array(locationEntrySchema).max(20), z.null()]).optional(),
		customTerms: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
		visibility: z.nativeEnum(JobVisibility).optional(),
		status: z.nativeEnum(JobStatus).optional(),
		languages: z.array(languageRequirementSchema).optional(),
		skills: jobPostSkillsSchema.optional(),
		screeningQuestions: z.array(screeningQuestionSchema).max(20).optional(),
		attachments: attachmentsSchema.optional()
	})
	.strict()

const parseStringArray = (value: unknown) => {
	if (value === undefined || value === null) return undefined
	const raw = Array.isArray(value) ? value : [value]
	const flattened = raw.flatMap(item =>
		String(item)
			.split(',')
			.map(piece => piece.trim())
			.filter(Boolean)
	)
	return flattened.length > 0 ? flattened : undefined
}

const booleanQuerySchema = z.preprocess(value => {
	if (value === undefined || value === null || value === '') return undefined
	if (typeof value === 'boolean') return value
	if (typeof value === 'number') return value !== 0
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (['true', '1', 'yes', 'y'].includes(normalized)) return true
		if (['false', '0', 'no', 'n'].includes(normalized)) return false
	}
	return value
}, z.boolean().optional())

const numericQuerySchema = z.preprocess(value => {
	if (value === undefined || value === null || value === '') return undefined
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const parsed = Number(value)
		return Number.isNaN(parsed) ? value : parsed
	}
	return value
}, z.number().nonnegative().optional())

const dateQuerySchema = z
	.preprocess(value => {
		if (value === undefined || value === null || value === '') return undefined
		return value instanceof Date ? value : new Date(String(value))
	}, z.date())
	.refine(date => !Number.isNaN(date.getTime()), 'Invalid date')
	.optional()

export const JobPostFilterSchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().trim().min(1).optional(),
		statuses: z.preprocess(parseStringArray, z.array(z.nativeEnum(JobStatus)).optional()).optional(),
		paymentModes: z.preprocess(parseStringArray, z.array(z.nativeEnum(JobPaymentMode)).optional()).optional(),
		experienceLevels: z.preprocess(parseStringArray, z.array(z.nativeEnum(JobExperienceLevel)).optional()).optional(),
		locationTypes: z.preprocess(parseStringArray, z.array(z.nativeEnum(JobLocationType)).optional()).optional(),
		visibility: z
			.preprocess(parseStringArray, z.array(z.nativeEnum(JobVisibility)).optional())
			.optional()
			.transform(value => (Array.isArray(value) ? value[0] : value)),
		formVersions: z.preprocess(parseStringArray, z.array(z.nativeEnum(JobPostFormVersion)).optional()).optional(),
		specialtyId: z.string().min(1).optional(),
		categoryId: z.string().min(1).optional(),
		languageCodes: z.preprocess(parseStringArray, z.array(z.string().min(2).max(10)).optional()).optional(),
		skillIds: z.preprocess(parseStringArray, z.array(z.string().min(1)).optional()).optional(),
		clientId: z.string().min(1).optional(),
		mine: booleanQuerySchema,
		hasAttachments: booleanQuerySchema,
		budgetMin: numericQuerySchema,
		budgetMax: numericQuerySchema,
		createdFrom: dateQuerySchema,
		createdTo: dateQuerySchema,
		sortBy: z.enum(['newest', 'oldest']).optional()
	})
	.strict()

export type CreateJobPostInput = z.infer<typeof CreateJobPostSchema>
export type UpdateJobPostInput = z.infer<typeof UpdateJobPostSchema>
export type JobPostFilterInput = z.infer<typeof JobPostFilterSchema>

export const FreelancerJobPostFilterSchema = JobPostFilterSchema.omit({
        mine: true,
        clientId: true,
        visibility: true
})

export type FreelancerJobPostFilterInput = z.infer<typeof FreelancerJobPostFilterSchema>
