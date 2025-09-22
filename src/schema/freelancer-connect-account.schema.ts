import { z } from 'zod'

// Payload used by the onboarding/update link endpoint. The mode defaults to
// onboarding because that is the first action users typically take, while the
// optional URLs let the frontend supply custom navigation destinations. The
// optional country field lets the UI pass the freelancer's selected payout
// country the moment onboarding starts so Stripe provisions the right account
// up front.
const CountryCodeSchema = z
	.string()
	.trim()
	.length(2, 'Country must be a two-letter ISO code (for example: US, VN).')
	.regex(/^[a-zA-Z]{2}$/u, 'Country must contain only alphabetic characters.')
	.transform(value => value.toUpperCase())

export const ConnectAccountLinkSchema = z.object({
	mode: z.enum(['onboarding', 'update']).default('onboarding'),
	returnUrl: z.string().url().optional(),
	refreshUrl: z.string().url().optional(),
	country: CountryCodeSchema.optional()
})

// Request body for generating a dashboard login link. When no redirectUrl is
// provided Stripe will send the freelancer back to the previous page.
export const ConnectAccountLoginLinkSchema = z.object({
	redirectUrl: z.string().url().optional()
})

export type ConnectAccountLinkInput = z.infer<typeof ConnectAccountLinkSchema>
export type ConnectAccountLoginLinkInput = z.infer<typeof ConnectAccountLoginLinkSchema>
