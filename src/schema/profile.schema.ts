import { z } from 'zod'

export const UpdateProfileSchema = z.object({
	displayName: z.string().trim().min(1).max(80).optional(),
	firstName: z.string().trim().min(1).max(50).optional(),
	lastName: z.string().trim().min(1).max(50).optional(),
	location: z.string().trim().max(120).optional()
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
