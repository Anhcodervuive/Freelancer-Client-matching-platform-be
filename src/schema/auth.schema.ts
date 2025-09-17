import { z } from 'zod'

export const roleEnum = z.enum(['FREELANCER', 'CLIENT', 'ADMIN'])

export const SignUpSchema = z.object({
	email: z.string().email(),
	password: z.string(),
	firstName: z.string().min(1).max(40),
	lastName: z.string().min(1).max(40)
})
