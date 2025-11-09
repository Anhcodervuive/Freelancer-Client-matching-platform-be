import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import freelancerConnectAccountService from '~/services/freelancer/connect-account.service'
import {
        ConnectAccountLinkSchema,
        ConnectAccountLoginLinkSchema,
        ConnectAccountRequestCapabilitiesSchema,
        ConnectAccountRequirementLinkSchema,
        ConnectAccountStatusQuerySchema
} from '~/schema/freelancer-connect-account.schema'

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
 * GET /freelancer/connect-account/status
 * Returns the latest account snapshot and, when Stripe requires additional information,
 * automatically prepares an onboarding/update link so the client can redirect the user.
 */
export const getConnectAccountStatus = async (req: Request, res: Response) => {
        const userId = req.user?.id

        const query = ConnectAccountStatusQuerySchema.parse(req.query)

        const result = await freelancerConnectAccountService.getConnectAccountStatus(userId!, query)

        return res.status(StatusCodes.OK).json(result)
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
 * POST /freelancer/connect-account/requirements-link
 * Generates an update link that focuses on the currently failing Stripe requirements
 * (for example, sửa thông tin ngân hàng). The frontend can optionally pass specific
 * requirement codes to double-check that Stripe vẫn đang yêu cầu chúng.
 */
export const createConnectAccountRequirementLink = async (req: Request, res: Response) => {
        const userId = req.user?.id

        const payload = ConnectAccountRequirementLinkSchema.parse(req.body)

        const result = await freelancerConnectAccountService.createRequirementUpdateLink(userId!, payload)

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

/**
 * POST /freelancer/connect-account/capabilities/retry
 * Yêu cầu Stripe kích hoạt lại các capability quan trọng (card_payments, transfers) sau khi freelancer
 * đã cập nhật hồ sơ, đồng thời trả về trạng thái mới nhất để giao diện hiển thị thông báo rõ ràng.
 */
export const requestConnectAccountCapabilityReview = async (req: Request, res: Response) => {
        const userId = req.user?.id

        const payload = ConnectAccountRequestCapabilitiesSchema.parse(req.body)

        const result = await freelancerConnectAccountService.requestCapabilityReview(userId!, payload)

        return res.status(StatusCodes.OK).json(result)
}

/**
 * DELETE /freelancer/connect-account
 * Removes the stored Stripe Connect account for the authenticated freelancer
 * and disconnects it from Stripe.
 */
export const deleteConnectAccount = async (req: Request, res: Response) => {
        const userId = req.user?.id

        await freelancerConnectAccountService.deleteConnectAccount(userId!)

        return res.status(StatusCodes.OK).json({
                message: 'Stripe Connect account deleted'
        })
}
