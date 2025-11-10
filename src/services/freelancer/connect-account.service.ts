import Stripe from 'stripe'

import type { FreelancerConnectAccount } from '~/generated/prisma'

import { CLIENT, STRIPE_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { InternalServerException } from '~/exceptions/internal-server'
import { ErrorCode } from '~/exceptions/root'
import type {
        ConnectAccountLinkInput,
        ConnectAccountLoginLinkInput,
        ConnectAccountRequestCapabilitiesInput,
        ConnectAccountRequirementLinkInput,
        ConnectAccountStatusQuery
} from '~/schema/freelancer-connect-account.schema'

const stripe = new Stripe(STRIPE_CONFIG_INFO.API_KEY!)

const stripTrailingSlash = (value: string) => value.replace(/\/$/, '')

// Stripe requires absolute URLs in several endpoints. The helpers below try to
// parse the configured client URL once so that we can derive consistent
// defaults and gracefully fall back when the environment only provides a local
// development host.
const parseClientUrl = (rawUrl: string | undefined) => {
	if (!rawUrl) {
		return null
	}

	try {
		return new URL(rawUrl)
	} catch (error) {
		return null
	}
}

const rawClientUrl = CLIENT.URL?.trim()
const parsedClientUrl = parseClientUrl(rawClientUrl)
const CLIENT_BASE_URL = parsedClientUrl
	? stripTrailingSlash(`${parsedClientUrl.origin}${parsedClientUrl.pathname}`)
	: undefined

const isLocalHostname = (hostname: string) =>
	['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname.toLowerCase())

// Express accounts demand a publicly reachable HTTPS URL for the business
// profile. Localhost or HTTP values cause Stripe to reject the request, so we
// skip sending the property unless the configured client URL is production
// ready.
const CLIENT_BUSINESS_PROFILE_URL =
	parsedClientUrl && parsedClientUrl.protocol === 'https:' && !isLocalHostname(parsedClientUrl.hostname)
		? CLIENT_BASE_URL
		: undefined

const DEFAULT_RETURN_URL = CLIENT_BASE_URL ? `${CLIENT_BASE_URL}/me/settings/get-paid` : undefined
const DEFAULT_REFRESH_URL = CLIENT_BASE_URL ? `${CLIENT_BASE_URL}/me/settings/get-paid/refresh` : undefined

type AccountLinkMode = 'onboarding' | 'update'

type EnsureAccountOptions = {
	createIfMissing?: boolean
	requestedCountry?: string | null
}

type AccountLinkResponse = {
        url: string
        expiresAt: string
        linkType: Stripe.AccountLinkCreateParams.Type
        connectAccount: FreelancerConnectAccount
        targetedRequirements?: string[]
}

const SUPPORTED_CAPABILITIES = [
        'card_payments',
        'transfers',
        'platform_payments',
        'bank_account_payments',
        'cash_balance'
] as const

type SupportedCapability = (typeof SUPPORTED_CAPABILITIES)[number]

type CapabilityStatus = 'active' | 'inactive' | 'pending'

type CapabilityStatusSummary = {
        capability: SupportedCapability
        label: string
        status: CapabilityStatus
        statusMessage: string
}

const CAPABILITY_LABELS: Record<SupportedCapability, string> = {
        card_payments: 'Nhận thanh toán',
        transfers: 'Rút tiền về ngân hàng',
        platform_payments: 'Thanh toán qua nền tảng',
        bank_account_payments: 'Thanh toán qua ngân hàng',
        cash_balance: 'Số dư Stripe Balance'
}

const CAPABILITY_STATUS_KEYS: Record<SupportedCapability, keyof Stripe.Account.Capabilities | null> = {
        card_payments: 'card_payments',
        transfers: 'transfers',
        platform_payments: 'legacy_payments',
        bank_account_payments: 'bank_transfer_payments',
        cash_balance: 'treasury'
}

const CAPABILITY_REQUEST_KEYS: Record<SupportedCapability, keyof Stripe.AccountUpdateParams.Capabilities | null> = {
        card_payments: 'card_payments',
        transfers: 'transfers',
        platform_payments: 'legacy_payments',
        bank_account_payments: 'bank_transfer_payments',
        cash_balance: 'treasury'
}

// Helper to convert Stripe enums into our uppercase representation so that the
// API response stays consistent with other payment resources.
const mapAccountType = (type: Stripe.Account.Type | null | undefined): 'EXPRESS' | 'STANDARD' | 'CUSTOM' => {
	switch (type) {
		case 'standard':
			return 'STANDARD'
		case 'custom':
			return 'CUSTOM'
		case 'express':
		default:
			return 'EXPRESS'
	}
}

const parseJsonStringArray = (value: unknown): string[] => {
        if (!Array.isArray(value)) {
                return []
        }

        return value.filter((item): item is string => typeof item === 'string')
}

const normalizeRequirementCodes = (codes: string[]): string[] => {
        const unique = new Set<string>()

        for (const code of codes) {
                const trimmed = code.trim()
                if (trimmed) {
                        unique.add(trimmed)
                }
        }

        return Array.from(unique)
}

const normalizeCapabilityStatus = (value: unknown): CapabilityStatus => {
        if (value === 'active' || value === 'pending') {
                return value
        }

        return 'inactive'
}

const describeCapabilityStatus = (capability: SupportedCapability, status: CapabilityStatus) => {
        const render = (messages: { active: string; pending: string; inactive: string }) => {
                switch (status) {
                        case 'active':
                                return messages.active
                        case 'pending':
                                return messages.pending
                        case 'inactive':
                        default:
                                return messages.inactive
                }
        }

        switch (capability) {
                case 'card_payments':
                        return render({
                                active: 'Stripe đã bật chức năng nhận thanh toán cho tài khoản này.',
                                pending: 'Stripe đang xem xét lại hồ sơ để bật nhận thanh toán trực tiếp.',
                                inactive:
                                        'Stripe chưa cho phép nhận thanh toán trực tiếp. Hãy hoàn tất onboarding và yêu cầu Stripe kích hoạt lại.'
                        })
                case 'transfers':
                        return render({
                                active: 'Stripe đã bật chức năng chuyển tiền về ngân hàng cho tài khoản này.',
                                pending: 'Stripe đang xử lý yêu cầu bật rút tiền về ngân hàng.',
                                inactive:
                                        'Stripe chưa cho phép rút tiền về ngân hàng. Cần hoàn tất đầy đủ yêu cầu xác minh trước khi thử lại.'
                        })
                case 'platform_payments':
                        return render({
                                active: 'Stripe đã bật xử lý thanh toán qua nền tảng cho tài khoản này.',
                                pending: 'Stripe đang xem xét yêu cầu kích hoạt xử lý thanh toán qua nền tảng.',
                                inactive:
                                        'Stripe chưa cho phép xử lý thanh toán qua nền tảng. Cần hoàn tất onboarding và gửi yêu cầu kích hoạt.'
                        })
                case 'bank_account_payments':
                        return render({
                                active: 'Stripe đã bật thanh toán qua tài khoản ngân hàng (ví dụ: ACH, chuyển khoản) cho tài khoản này.',
                                pending: 'Stripe đang thẩm định để bật thanh toán qua tài khoản ngân hàng.',
                                inactive:
                                        'Stripe chưa cho phép thanh toán qua tài khoản ngân hàng. Hãy bổ sung hồ sơ và yêu cầu Stripe kích hoạt.'
                        })
                case 'cash_balance':
                        return render({
                                active: 'Stripe đã bật số dư Stripe Balance để giữ và sử dụng tiền trong tài khoản.',
                                pending: 'Stripe đang xử lý yêu cầu bật số dư Stripe Balance.',
                                inactive:
                                        'Stripe chưa cho phép sử dụng Stripe Balance. Hãy kiểm tra các yêu cầu xác minh còn thiếu và gửi lại yêu cầu.'
                        })
                default:
                        return render({
                                active: 'Stripe đã bật capability này.',
                                pending: 'Stripe đang xử lý yêu cầu kích hoạt capability này.',
                                inactive:
                                        'Stripe chưa bật capability này. Hãy hoàn tất các yêu cầu xác minh và thử lại.'
                        })
        }
}

const summarizeCapabilityStatuses = (account: Stripe.Account): CapabilityStatusSummary[] => {
        const capabilities = account.capabilities ?? {}

        return SUPPORTED_CAPABILITIES.map(capability => {
                const stripeKey = CAPABILITY_STATUS_KEYS[capability]
                const rawStatus = stripeKey ? capabilities[stripeKey] : undefined
                const status = normalizeCapabilityStatus(rawStatus)

                return {
                        capability,
                        label: CAPABILITY_LABELS[capability],
                        status,
                        statusMessage: describeCapabilityStatus(capability, status)
                }
        })
}

const gatherRequirementCodes = (
        account: Stripe.Account | null,
        accountRecord: FreelancerConnectAccount
): Set<string> => {
        const codes = new Set<string>()

        const pushMany = (values: string[]) => {
                for (const value of values) {
                        if (value) {
                                codes.add(value)
                        }
                }
        }

        pushMany(parseJsonStringArray(accountRecord.requirementsCurrentlyDue))
        pushMany(parseJsonStringArray(accountRecord.requirementsPastDue))
        pushMany(parseJsonStringArray(accountRecord.requirementsDue))

        const requirementErrors = account?.requirements?.errors ?? []
        for (const error of requirementErrors) {
                if (typeof error.code === 'string') {
                        codes.add(error.code)
                }

                if (typeof error.requirement === 'string') {
                        codes.add(error.requirement)
                }
        }

        const pendingVerification = account?.requirements?.pending_verification ?? []
        pushMany(pendingVerification.filter((value): value is string => typeof value === 'string'))

        return codes
}

/**
 * Converts the Stripe account payload to our persistence shape so that the dashboard
 * can render the latest compliance information. This is a simple data mapper without
 * side effects, which makes it easier to unit test in the future.
 */
const mapStripeAccountToConnectAccountData = (account: Stripe.Account) => {
	const requirements = account.requirements

	const firstExternalAccount = account.external_accounts?.data?.[0]
	let sanitizedExternalAccount: Record<string, string> | null = null

	if (firstExternalAccount?.object === 'bank_account') {
		const details = firstExternalAccount as Stripe.BankAccount
		const summary: Record<string, string> = {}

		if (details.bank_name) {
			summary.bank_name = details.bank_name
		}

		if (details.last4) {
			summary.last4 = details.last4
		}

		if (details.account_holder_type) {
			summary.account_holder_type = details.account_holder_type
		}

		sanitizedExternalAccount = Object.keys(summary).length > 0 ? summary : null
	}
	return {
		stripeAccountId: account.id,
		accountType: mapAccountType(account.type),
		detailsSubmitted: account.details_submitted ?? false,
		payoutsEnabled: account.payouts_enabled ?? false,
		chargesEnabled: account.charges_enabled ?? false,
		country: account.country ?? '',
		defaultCurrency: account.default_currency ?? '',
		externalAccountSummary: sanitizedExternalAccount ?? '',
		requirementsDue: requirements?.eventually_due ?? [],
		requirementsCurrentlyDue: requirements?.currently_due ?? [],
		requirementsPastDue: requirements?.past_due ?? [],
		disabledReason: requirements?.disabled_reason ?? null,
		disabledAt: requirements?.current_deadline ? new Date(requirements.current_deadline * 1000) : null
	}
}

const handleStripeError = (error: unknown): never => {
	if (error instanceof Stripe.errors.StripeError) {
		throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
	}
	throw error
}

/**
 * Loads the authenticated user alongside the freelancer profile so we can guard
 * the endpoints. These checks ensure that a freelancer exists and owns the payout
 * method they are trying to manage.
 */
const ensureFreelancerContext = async (userId: string) => {
	const [user, freelancer] = await Promise.all([
		prismaClient.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, role: true }
		}),
		prismaClient.freelancer.findUnique({
			where: { userId },
			include: {
				profile: {
					select: {
						country: true
					}
				}
			}
		})
	])

	if (!user) {
		throw new BadRequestException('User not found', ErrorCode.USER_NOT_FOUND)
	}

	if (!freelancer) {
		throw new BadRequestException('Freelancer profile not found', ErrorCode.USER_NOT_AUTHORITY)
	}

	if (user.role !== 'FREELANCER') {
		throw new BadRequestException('Only freelancers can manage payout methods', ErrorCode.USER_NOT_AUTHORITY)
	}

	return { user, freelancer }
}

/**
 * Creates a brand-new Stripe Connect Express account that mirrors the freelancer
 * information in our database. We deliberately require a country code from the
 * caller so that we do not rely on any implicit defaults.
 */
const createStripeExpressAccount = async (params: {
	userId: string
	email: string
	country: string
}): Promise<Stripe.Account> => {
	try {
    const businessProfile: Stripe.AccountCreateParams.BusinessProfile = {
            product_description: 'Freelance payouts on the platform',
            mcc: '7333'
    }

		if (CLIENT_BUSINESS_PROFILE_URL) {
			businessProfile.url = CLIENT_BUSINESS_PROFILE_URL
		}

                const account = await stripe.accounts.create({
                        type: 'express',
                        email: params.email,
                        country: params.country,
                        business_type: 'individual',
                        settings: {
                                payouts: {
                                        schedule: {
                                                interval: 'manual'
                                        }
                                }
                        },
                        capabilities: {
                                transfers: { requested: true },
                                card_payments: { requested: true }
                        },
			business_profile: businessProfile,
			metadata: {
				userId: params.userId
			}
		})

		return account as Stripe.Account
	} catch (error) {
		return handleStripeError(error)
	}
}

/**
 * Fetches (and optionally creates) the Stripe Connect account for the freelancer.
 * Whenever we have to create a new account, we make sure the request carries a
 * valid country code (either explicitly via the onboarding payload or implicitly
 * from the saved profile) so we never invent backend defaults.
 */
const ensureStripeAccount = async (userId: string, options?: EnsureAccountOptions) => {
	const { user, freelancer } = await ensureFreelancerContext(userId)

	let accountRecord = await prismaClient.freelancerConnectAccount.findUnique({
		where: { freelancerId: userId }
	})

	if (!accountRecord) {
		if (!options?.createIfMissing) {
			return { user, freelancer, account: null, accountRecord: null }
		}

		const countryCode = options?.requestedCountry

		const createdAccount = await createStripeExpressAccount({
			userId,
			email: user.email,
			country: countryCode!
		})

		accountRecord = await prismaClient.freelancerConnectAccount.create({
			data: {
				freelancerId: userId,
				...mapStripeAccountToConnectAccountData(createdAccount)
			}
		})

		return { user, freelancer, account: createdAccount, accountRecord }
	}

	// Always refresh the remote account so that our stored requirements stay in sync
	// with Stripe. If the account was deleted externally Stripe will surface an
	// error that bubbles up via the shared handler.
	const account = await stripe.accounts.retrieve(accountRecord.stripeAccountId)

	accountRecord = await prismaClient.freelancerConnectAccount.update({
		where: { freelancerId: userId },
		data: mapStripeAccountToConnectAccountData(account)
	})

	return { user, freelancer, account, accountRecord }
}

const hasOutstandingRequirements = (account: Stripe.Account | null, accountRecord: FreelancerConnectAccount) => {
        if (!accountRecord.detailsSubmitted) {
                return true
        }

        const requirements = account?.requirements

        if (!requirements) {
                return false
        }

        const requiredFields = [
                ...(requirements.currently_due ?? []),
                ...(requirements.past_due ?? []),
                ...(requirements.eventually_due ?? []),
                ...(requirements.pending_verification ?? [])
        ]

        if (requiredFields.some(value => typeof value === 'string' && value.trim().length > 0)) {
                return true
        }

        if ((requirements.errors ?? []).length > 0) {
                return true
        }

        const disabledReason = requirements.disabled_reason ?? accountRecord.disabledReason
        if (typeof disabledReason === 'string' && disabledReason.trim().length > 0) {
                return true
        }

        if (account && !account.payouts_enabled) {
                return true
        }

        const universe = gatherRequirementCodes(account ?? null, accountRecord)

        return universe.size > 0
}

const createAccountLinkForAccount = async (
        account: Stripe.Account,
        accountRecord: FreelancerConnectAccount,
        options: {
                mode: AccountLinkMode
                returnUrl: string
                refreshUrl: string
        }
): Promise<AccountLinkResponse> => {
        const resolveLinkType = (mode: AccountLinkMode): Stripe.AccountLinkCreateParams.Type => {
                if (mode === 'onboarding') {
                        return 'account_onboarding'
                }

                return hasOutstandingRequirements(account, accountRecord) ? 'account_onboarding' : 'account_update'
        }

        const buildParams = (linkType: Stripe.AccountLinkCreateParams.Type): Stripe.AccountLinkCreateParams => {
                const params: Stripe.AccountLinkCreateParams = {
                        account: account.id,
                        return_url: options.returnUrl,
                        refresh_url: options.refreshUrl,
                        type: linkType
                }

                if (linkType === 'account_onboarding') {
                        params.collect = 'eventually_due'
                }

                return params
        }

        const attemptCreate = async (linkType: Stripe.AccountLinkCreateParams.Type): Promise<AccountLinkResponse> => {
                const accountLink = await stripe.accountLinks.create(buildParams(linkType))

                return {
                        url: accountLink.url,
                        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
                        linkType,
                        connectAccount: accountRecord
                }
        }

        const shouldFallbackToOnboarding = (
                error: unknown,
                attemptedType: Stripe.AccountLinkCreateParams.Type
        ): error is Stripe.errors.StripeInvalidRequestError => {
                if (attemptedType !== 'account_update') {
                        return false
                }

                if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
                        return false
                }

                const normalize = (value: unknown) =>
                        typeof value === 'string' ? value.toLowerCase() : ''

                const message = normalize(error.message)
                const rawMessage = normalize((error.raw && (error.raw as { message?: string }).message) ?? undefined)

                if (message.includes('account_update') && message.includes('account_onboarding')) {
                        return true
                }

                if (rawMessage.includes('account_update') && rawMessage.includes('account_onboarding')) {
                        return true
                }

                if (normalize(error.code).includes('account') && normalize(error.param) === 'type') {
                        return true
                }

                const rawType = normalize((error.raw && (error.raw as { type?: string }).type) ?? undefined)
                if (rawType === 'invalid_request_error' && normalize((error.raw && (error.raw as { param?: string }).param) ?? undefined) === 'type') {
                        return true
                }

                const rawCode = normalize((error.raw && (error.raw as { code?: string }).code) ?? undefined)
                if (rawCode.includes('link_type') || rawCode.includes('account_link')) {
                        return true
                }

                return false
        }

        const initialType = resolveLinkType(options.mode)

        try {
                return await attemptCreate(initialType)
        } catch (error) {
                if (shouldFallbackToOnboarding(error, initialType)) {
                        return attemptCreate('account_onboarding')
                }

                return handleStripeError(error)
        }
}

/**
 * Returns the cached connect account information. When the freelancer has never
 * started onboarding we return null so the client can show an empty state.
 */
const getConnectAccount = async (userId: string) => {
	const result = await ensureStripeAccount(userId, { createIfMissing: false })
	if (!result.accountRecord) {
		return null
	}
	return result.accountRecord
}

const getConnectAccountStatus = async (userId: string, query: ConnectAccountStatusQuery) => {
        const result = await ensureStripeAccount(userId, { createIfMissing: false })

        if (!result.account || !result.accountRecord) {
                return {
			connectAccount: null,
			needsUpdate: false,
			nextAction: null
		}
	}

	const { account, accountRecord } = result

	const requirementsCurrentlyDue = parseJsonStringArray(accountRecord.requirementsCurrentlyDue)
	const requirementsPastDue = parseJsonStringArray(accountRecord.requirementsPastDue)
	const requirementsDue = parseJsonStringArray(accountRecord.requirementsDue)

	const requiresOnboarding = !accountRecord.detailsSubmitted
	const hasPendingRequirements =
		requiresOnboarding ||
		requirementsCurrentlyDue.length > 0 ||
		requirementsPastDue.length > 0 ||
		requirementsDue.length > 0 ||
		Boolean(accountRecord.disabledReason)

	if (!hasPendingRequirements) {
		return {
			connectAccount: accountRecord,
			needsUpdate: false,
			nextAction: null
		}
	}

        const mode: AccountLinkMode = accountRecord.detailsSubmitted ? 'update' : 'onboarding'

	const returnUrl = query.returnUrl ?? DEFAULT_RETURN_URL
	const refreshUrl = query.refreshUrl ?? DEFAULT_REFRESH_URL

	if (!returnUrl || !refreshUrl) {
		return {
			connectAccount: accountRecord,
			needsUpdate: true,
			nextAction: {
				type: mode === 'onboarding' ? 'ACCOUNT_ONBOARDING' : 'ACCOUNT_UPDATE',
				url: null,
				expiresAt: null,
				reason: 'MISSING_RETURN_URL',
				linkType: mode === 'onboarding' ? 'account_onboarding' : 'account_update'
			}
		}
	}
        try {
                const accountLink = await createAccountLinkForAccount(account, accountRecord, {
                        mode,
                        returnUrl,
                        refreshUrl
		})

		return {
			connectAccount: accountRecord,
			needsUpdate: true,
			nextAction: {
				type: mode === 'onboarding' ? 'ACCOUNT_ONBOARDING' : 'ACCOUNT_UPDATE',
				url: accountLink.url,
				expiresAt: accountLink.expiresAt,
				linkType: accountLink.linkType
			}
		}
	} catch (error) {
		return handleStripeError(error)
	}
}

const requestCapabilityReview = async (
        userId: string,
        input: ConnectAccountRequestCapabilitiesInput
) => {
        const result = await ensureStripeAccount(userId, { createIfMissing: false })

        const { account, accountRecord } = result

        if (!account || !accountRecord) {
                throw new BadRequestException('Stripe Connect account not found', ErrorCode.ITEM_NOT_FOUND)
        }

        const requested = input.capabilities && input.capabilities.length > 0
                ? Array.from(new Set<SupportedCapability>(input.capabilities))
                : Array.from(SUPPORTED_CAPABILITIES)

        const capabilitiesPayload: Stripe.AccountUpdateParams.Capabilities = {}
        const ignoredCapabilities: SupportedCapability[] = []

        for (const capability of requested) {
                const stripeKey = CAPABILITY_REQUEST_KEYS[capability]

                if (!stripeKey) {
                        ignoredCapabilities.push(capability)
                        continue
                }

                capabilitiesPayload[stripeKey] = { requested: true }
        }

        let updatedAccount = account
        let updatedAccountRecord = accountRecord

        if (Object.keys(capabilitiesPayload).length > 0) {
                try {
                        updatedAccount = (await stripe.accounts.update(account.id, {
                                capabilities: capabilitiesPayload
                        })) as Stripe.Account

                        updatedAccountRecord = await prismaClient.freelancerConnectAccount.update({
                                where: { freelancerId: userId },
                                data: mapStripeAccountToConnectAccountData(updatedAccount)
                        })
                } catch (error) {
                        handleStripeError(error)
                }
        }

        const capabilityStatuses = summarizeCapabilityStatuses(updatedAccount)

        return {
                requestedCapabilities: requested,
                ignoredCapabilities,
                capabilityStatuses,
                connectAccount: updatedAccountRecord
        }
}

/**
 * Produces an onboarding or update link so the freelancer can complete any pending
 * requirements on Stripe. We create the account lazily if needed, honoring the
 * requested country override, and keep a copy of the refreshed account state for
 * the dashboard.
 */
const createAccountLink = async (userId: string, input: ConnectAccountLinkInput) => {
        const requestedCountry = input.country ?? null

        const result = await ensureStripeAccount(userId, {
                createIfMissing: true,
		requestedCountry
	})

	const { account, accountRecord } = result

	if (!account || !accountRecord) {
		throw new InternalServerException('Failed to prepare Stripe Connect account', ErrorCode.INTERNAL_SERVER_ERROR)
	}

	const desiredMode: AccountLinkMode = (input.mode ?? 'onboarding') as AccountLinkMode

	const returnUrl = input.returnUrl ?? DEFAULT_RETURN_URL
	const refreshUrl = input.refreshUrl ?? DEFAULT_REFRESH_URL

	if (!returnUrl || !refreshUrl) {
		throw new InternalServerException(
			'Stripe account links require absolute return and refresh URLs. Provide them in the request body or set CLIENT_URL to a public https domain.',
			ErrorCode.INTERNAL_SERVER_ERROR
		)
	}

	try {
		const accountLink = await createAccountLinkForAccount(account, accountRecord, {
			mode: desiredMode,
			returnUrl,
			refreshUrl
		})

		return accountLink
	} catch (error) {
                handleStripeError(error)
        }
}

const createRequirementUpdateLink = async (userId: string, input: ConnectAccountRequirementLinkInput) => {
        const result = await ensureStripeAccount(userId, { createIfMissing: false })

        const { account, accountRecord } = result

        if (!account || !accountRecord) {
                throw new BadRequestException('Stripe Connect account not found', ErrorCode.ITEM_NOT_FOUND)
        }

        const requirementUniverse = gatherRequirementCodes(account, accountRecord)

        const returnUrl = input.returnUrl ?? DEFAULT_RETURN_URL
        const refreshUrl = input.refreshUrl ?? DEFAULT_REFRESH_URL

        if (!returnUrl || !refreshUrl) {
                throw new InternalServerException(
                        'Stripe account links require absolute return and refresh URLs. Provide them in the request body or set CLIENT_URL to a public https domain.',
                        ErrorCode.INTERNAL_SERVER_ERROR
                )
        }

        let targetedRequirements: string[] = []

        if (input.requirementCodes && input.requirementCodes.length > 0) {
                const normalized = normalizeRequirementCodes(input.requirementCodes)

                const missingCodes = normalized.filter(code => !requirementUniverse.has(code))

                if (missingCodes.length > 0) {
                        throw new BadRequestException(
                                `Stripe không yêu cầu các hạng mục: ${missingCodes.join(', ')}. Vui lòng tải lại trang để đồng bộ yêu cầu mới nhất.`,
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                targetedRequirements = normalized
        } else {
                targetedRequirements = Array.from(requirementUniverse)
        }

        const mode: AccountLinkMode = accountRecord.detailsSubmitted ? 'update' : 'onboarding'

        try {
                const accountLink = await createAccountLinkForAccount(account, accountRecord, {
                        mode,
                        returnUrl,
                        refreshUrl
                })

                return {
                        ...accountLink,
                        targetedRequirements
                }
        } catch (error) {
                handleStripeError(error)
        }
}

/**
 * Generates a direct dashboard login link so freelancers can view their Stripe
 * payout statements. We avoid creating new accounts here because the login link is
 * only meaningful once onboarding has already been completed at least once.
 */
const createLoginLink = async (userId: string, input: ConnectAccountLoginLinkInput) => {
	const result = await ensureStripeAccount(userId, { createIfMissing: false })

	const { account, accountRecord } = result

	if (!account || !accountRecord) {
		throw new BadRequestException('Stripe Connect account not found', ErrorCode.ITEM_NOT_FOUND)
	}

	try {
		const params: Stripe.AccountCreateLoginLinkParams & { redirect_url?: string } = {}
		if (input.redirectUrl) {
			params.redirect_url = input.redirectUrl
		}

		const loginLink = await stripe.accounts.createLoginLink(account.id, params)

		return {
			url: loginLink.url,
			connectAccount: accountRecord
		}
	} catch (error) {
		handleStripeError(error)
	}
}

const deleteConnectAccount = async (userId: string) => {
        await ensureFreelancerContext(userId)

        const accountRecord = await prismaClient.freelancerConnectAccount.findUnique({
                where: { freelancerId: userId }
	})

	if (!accountRecord) {
		throw new BadRequestException('Stripe Connect account not found', ErrorCode.ITEM_NOT_FOUND)
	}

	try {
		await stripe.accounts.del(accountRecord.stripeAccountId)
	} catch (error) {
		if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
			// The account may have already been deleted on Stripe. Remove our record regardless.
		} else {
			handleStripeError(error)
		}
	}

        await prismaClient.freelancerConnectAccount.delete({
                where: { freelancerId: userId }
        })
}

export { ensureStripeAccount, summarizeCapabilityStatuses }

export type { CapabilityStatusSummary }

export default {
        getConnectAccount,
        getConnectAccountStatus,
        requestCapabilityReview,
        createAccountLink,
        createRequirementUpdateLink,
        createLoginLink,
        deleteConnectAccount
}
