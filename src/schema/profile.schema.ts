import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export const phoneSchema = z
	.string()
	.min(1)
	.refine(
		v => {
			const p = parsePhoneNumberFromString(v || '')
			return !!(p && p.isValid())
		},
		{ message: 'Số điện thoại không hợp lệ' }
	)

export const UpdateProfileSchema = z.object({
	firstName: z.string().trim().min(1).max(50).optional(),
	lastName: z.string().trim().min(1).max(50).optional(),
	country: z.string().trim().min(1).max(50).optional(),
	city: z.string().trim().min(1).max(50).optional(),
	district: z.string().trim().min(1).max(50).optional(),
	address: z.string().trim().min(1).max(50).optional(),
	phoneNumber: z
		.string()
		.min(1)
		.refine(
			v => {
				const p = parsePhoneNumberFromString(v || '')
				return !!(p && p.isValid())
			},
			{ message: 'Số điện thoại không hợp lệ' }
		)
		.optional()
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
