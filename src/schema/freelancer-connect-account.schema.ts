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

const RequirementCodeSchema = z
        .string()
        .trim()
        .min(1, 'Mã yêu cầu không được để trống.')

export const ConnectAccountRequirementLinkSchema = z.object({
        requirementCodes: z
                .array(RequirementCodeSchema)
                .min(1, 'Cần truyền ít nhất một mã yêu cầu nếu muốn giới hạn hạng mục cần cập nhật.')
                .optional(),
        returnUrl: z.string().url().optional(),
        refreshUrl: z.string().url().optional()
})

// Request body for generating a dashboard login link. When no redirectUrl is
// provided Stripe will send the freelancer back to the previous page.
export const ConnectAccountLoginLinkSchema = z.object({
        redirectUrl: z.string().url().optional()
})

export const ConnectAccountStatusQuerySchema = z.object({
        returnUrl: z.string().url().optional(),
        refreshUrl: z.string().url().optional()
})

const CapabilitySchema = z.enum([
        'card_payments',
        'transfers',
        'platform_payments',
        'bank_account_payments',
        'cash_balance'
])

export const ConnectAccountRequestCapabilitiesSchema = z.object({
        capabilities: z
                .array(CapabilitySchema)
                .min(1, 'Cần chọn ít nhất một capability để Stripe xem xét lại.')
                .optional()
})

export type ConnectAccountLinkInput = z.infer<typeof ConnectAccountLinkSchema>
export type ConnectAccountRequirementLinkInput = z.infer<typeof ConnectAccountRequirementLinkSchema>
export type ConnectAccountLoginLinkInput = z.infer<typeof ConnectAccountLoginLinkSchema>
export type ConnectAccountStatusQuery = z.infer<typeof ConnectAccountStatusQuerySchema>
export type ConnectAccountRequestCapabilitiesInput = z.infer<
        typeof ConnectAccountRequestCapabilitiesSchema
>
