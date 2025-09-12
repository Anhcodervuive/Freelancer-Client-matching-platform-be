import { z } from 'zod'

export const SpecialtyBaseSchema = z.object({
	name: z.string().min(2).max(80),
	slug: z
		.string()
		.min(2)
		.regex(/^[a-z0-9-]+$/),
	description: z.string().max(300).optional().or(z.literal('')),
	sortOrder: z.coerce.number().int().min(0).default(0),
	isActive: z.boolean().default(true)
})

// Dùng cho UX B (global create): cần categoryId trong body
export const SpecialtyCreateGlobalSchema = SpecialtyBaseSchema.extend({
	categoryId: z.string().min(1)
})

// Update (PATCH-like)
export const SpecialtyUpdateSchema = SpecialtyBaseSchema.partial().extend({
	categoryId: z.string().min(1).optional() // cho phép chuyển category
})

export const SpecialtyQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional().default(''),
	categoryId: z.string().optional() // filter theo category khi list (UX B)
})

export type SpecialtyBase = z.infer<typeof SpecialtyBaseSchema>
export type SpecialtyCreateGlobal = z.infer<typeof SpecialtyCreateGlobalSchema>
export type SpecialtyUpdate = z.infer<typeof SpecialtyUpdateSchema>
export type SpecialtyQuery = z.infer<typeof SpecialtyQuerySchema>
