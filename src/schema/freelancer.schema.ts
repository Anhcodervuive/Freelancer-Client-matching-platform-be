import { z } from 'zod'

const parseFilterArray = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        const raw = Array.isArray(value) ? value : [value]
        const normalized = raw
                .flatMap(item =>
                        String(item)
                                .split(',')
                                .map(part => part.trim())
                                .filter(Boolean)
                )
        return normalized.length > 0 ? normalized : undefined
}

export const ClientFreelancerFilterSchema = z
        .object({
                page: z.coerce.number().int().min(1).default(1),
                limit: z.coerce.number().int().min(1).max(100).default(20),
                search: z.string().trim().min(1).optional(),
                specialtyId: z.string().min(1).optional(),
                skillIds: z.preprocess(parseFilterArray, z.array(z.string().min(1)).optional()).optional(),
                country: z.string().trim().min(1).optional()
        })
        .strict()

export type ClientFreelancerFilterInput = z.infer<typeof ClientFreelancerFilterSchema>

export const UpdateFreelancerProfileSchema = z.object({
        title: z.string().max(255).optional(),
        bio: z.string().max(5000).optional(),
        links: z.array(z.string().url()).optional()
})

export type UpdateFreelanceProfileInput = z.infer<typeof UpdateFreelancerProfileSchema>

export const AddOneEducationSchema = z
	.object({
		schoolName: z.string().min(5).max(50),
		degreeTitle: z.string().min(1).max(50),
		fieldOfStudy: z.string().min(1).max(50).optional(),
		startYear: z.int(),
		endYear: z.int()
	})
	.superRefine((data, ctx) => {
		if (data.startYear >= data.endYear) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'startDate phải nhỏ hơn endDate',
				path: ['startDate'] // báo lỗi ở startDate
			})
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'endDate phải lớn hơn startDate',
				path: ['endDate'] // báo lỗi ở endDate
			})
		}
	})

export const UpdateOneEducationSchema = z
	.object({
		schoolName: z.string().min(10).max(50).optional(),
		degreeTitle: z.string().min(1).max(50).optional(),
		fieldOfStudy: z.string().min(1).max(50).optional(),
		startYear: z.int(),
		endYear: z.int()
	})
	.superRefine((data, ctx) => {
		if (data.startYear >= data.endYear) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'startDate phải nhỏ hơn endDate',
				path: ['startDate'] // báo lỗi ở startDate
			})
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'endDate phải lớn hơn startDate',
				path: ['endDate'] // báo lỗi ở endDate
			})
		}
	})

export type AddOneEducationInput = z.infer<typeof AddOneEducationSchema>

export const ProficiencyEnum = z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE'])

export const AddOneSchema = z.object({
	languageCode: z.string().min(1).max(10), // ISO 639-1, ví dụ "en"
	proficiency: ProficiencyEnum
})
