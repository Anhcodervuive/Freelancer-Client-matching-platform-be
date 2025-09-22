import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import freelancerConnectAccountService from '~/services/freelancer/connect-account.service'
import { ConnectAccountLinkSchema, ConnectAccountLoginLinkSchema } from '~/schema/freelancer-connect-account.schema'

/**
 * GET /freelancer/connect-account
 * Returns the persisted Stripe Connect account snapshot for the authenticated freelancer.
 */
export const getConnectAccount = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const account = await freelancerConnectAccountService.getConnectAccount(userId!)

	return res.status(StatusCodes.OK).json(account)
}

/**
 * POST /freelancer/connect-account/link
 * Initiates or resumes onboarding by creating an account link that the frontend
 * can redirect the freelancer to. Optional return and refresh URLs let the client
 * customize the navigation flow, while the optional country code allows the UI to
 * capture the freelancer's payout country before starting onboarding.
 */
export const createConnectAccountLink = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const payload = ConnectAccountLinkSchema.parse(req.body)

	const result = await freelancerConnectAccountService.createAccountLink(userId!, payload)

	return res.status(StatusCodes.CREATED).json(result)
}

/**
 * POST /freelancer/connect-account/login-link
 * Generates a short-lived login link so the freelancer can access the Stripe
 * Express dashboard without leaving our product experience.
 */
export const createConnectAccountLoginLink = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const payload = ConnectAccountLoginLinkSchema.parse(req.body)

	const result = await freelancerConnectAccountService.createLoginLink(userId!, payload)

	return res.status(StatusCodes.OK).json(result)
}
