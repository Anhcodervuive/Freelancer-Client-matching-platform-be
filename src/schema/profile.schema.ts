import { z } from 'zod'

export const UpdateProfileSchema = z.object({
	displayName: z.string().trim().min(1).max(80).optional(),
	firstName: z.string().trim().min(1).max(50).optional(),
	lastName: z.string().trim().min(1).max(50).optional(),
	avatar: z.string().url().optional(),
	bio: z.string().trim().max(1000).optional(),
	location: z.string().trim().max(120).optional(),
	links: z.array(z.string().url()).max(10).optional()
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
