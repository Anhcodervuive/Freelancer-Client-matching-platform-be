import { z } from 'zod'

export const AddOneEducationSchema = z
	.object({
		schoolName: z.string().min(10).max(50),
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
