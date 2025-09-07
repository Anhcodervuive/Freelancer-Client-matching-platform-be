import { z } from 'zod'

export const AddPmSchema = z.object({
	paymentMethodId: z.string().min(3), // pm_xxx
	makeDefault: z.boolean().optional().default(true)
})

export const UpdatePmSchema = z.object({
	firstName: z.string().trim().optional(),
	lastName: z.string().trim().optional(),
	billingCountry: z.string().trim().optional(),
	billingCity: z.string().trim().optional(),
	billingLine1: z.string().trim().optional(),
	billingLine2: z.string().trim().optional(),
	billingPostal: z.string().trim().optional()
})
