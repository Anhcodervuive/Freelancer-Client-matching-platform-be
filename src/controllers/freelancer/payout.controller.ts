import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import {
        CreateFreelancerPayoutSchema,
        FreelancerPayoutQuerySchema
} from '~/schema/freelancer-payout.schema'
import freelancerPayoutService from '~/services/freelancer/payout.service'

export const getFreelancerPayoutSnapshot = async (req: Request, res: Response) => {
        const freelancerId = req.user?.id
        const query = FreelancerPayoutQuerySchema.parse(req.query)
        const snapshot = await freelancerPayoutService.getPayoutSnapshot(freelancerId!, {
                currency: query.currency,
                limit: query.limit
        })

        return res.status(StatusCodes.OK).json(snapshot)
}

export const createFreelancerPayout = async (req: Request, res: Response) => {
        const freelancerId = req.user?.id
        const payload = CreateFreelancerPayoutSchema.parse(req.body)

        const record = await freelancerPayoutService.createFreelancerPayout(freelancerId!, {
                amount: payload.amount,
                currency: payload.currency,
                idempotencyKey: payload.idempotencyKey ?? undefined,
                transferIds: payload.transferIds
        })

        return res.status(StatusCodes.CREATED).json(record)
}
