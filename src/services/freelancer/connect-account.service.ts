import Stripe from 'stripe'

import { CLIENT, STRIPE_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { BadRequestException } from '~/exceptions/bad-request'
import { InternalServerException } from '~/exceptions/internal-server'
import { ErrorCode } from '~/exceptions/root'
import type { ConnectAccountLinkInput, ConnectAccountLoginLinkInput } from '~/schema/freelancer-connect-account.schema'

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

const DEFAULT_RETURN_URL = CLIENT_BASE_URL ? `${CLIENT_BASE_URL}/settings/payouts` : undefined
const DEFAULT_REFRESH_URL = CLIENT_BASE_URL ? `${CLIENT_BASE_URL}/settings/payouts/refresh` : undefined

type AccountLinkMode = 'onboarding' | 'update'

type EnsureAccountOptions = {
	createIfMissing?: boolean
	requestedCountry?: string | null
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

/**
 * Converts the Stripe account payload to our persistence shape so that the dashboard
 * can render the latest compliance information. This is a simple data mapper without
 * side effects, which makes it easier to unit test in the future.
 */
const mapStripeAccountToConnectAccountData = (account: Stripe.Account) => {
	const requirements = account.requirements
	return {
		stripeAccountId: account.id,
		accountType: mapAccountType(account.type),
		detailsSubmitted: account.details_submitted ?? false,
		payoutsEnabled: account.payouts_enabled ?? false,
		chargesEnabled: account.charges_enabled ?? false,
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
			product_description: 'Freelance payouts on the platform'
		}

		if (CLIENT_BUSINESS_PROFILE_URL) {
			businessProfile.url = CLIENT_BUSINESS_PROFILE_URL
		}

		const account = await stripe.accounts.create({
			type: 'express',
			email: params.email,
			country: params.country,
			business_type: 'individual',
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
	const linkType: Stripe.AccountLinkCreateParams.Type =
		accountRecord.detailsSubmitted && desiredMode === 'update' ? 'account_update' : 'account_onboarding'

	const returnUrl = input.returnUrl ?? DEFAULT_RETURN_URL
	const refreshUrl = input.refreshUrl ?? DEFAULT_REFRESH_URL

	if (!returnUrl || !refreshUrl) {
		throw new InternalServerException(
			'Stripe account links require absolute return and refresh URLs. Provide them in the request body or set CLIENT_URL to a public https domain.',
			ErrorCode.INTERNAL_SERVER_ERROR
		)
	}

	const params: Stripe.AccountLinkCreateParams = {
		account: account.id,
		return_url: returnUrl,
		refresh_url: refreshUrl,
		type: linkType
	}

	if (params.type === 'account_onboarding') {
		// Collect all requirements that Stripe expects eventually so the user
		// can finish onboarding in a single session whenever possible.
		params.collect = 'eventually_due'
	}

	try {
		const accountLink = await stripe.accountLinks.create(params)

		return {
			url: accountLink.url,
			expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
			linkType: params.type,
			connectAccount: accountRecord
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

export default {
	getConnectAccount,
	createAccountLink,
	createLoginLink
}
