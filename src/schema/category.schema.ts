import { z } from 'zod'

export const CreateCategorySchema = z.object({
	name: z.string().min(2).max(80),
	slug: z
		.string()
		.min(2)
		.regex(/^[a-z0-9-]+$/),
	description: z.string().max(300).optional().or(z.literal('')),
	isActive: z.boolean().default(true),
	sortOrder: z.coerce.number().int().min(0).default(0)
})

export const UpdateCategorySchema = CreateCategorySchema.partial()
export type CategoryInput = z.infer<typeof CreateCategorySchema>
