import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { SpendingStatisticsQuerySchema } from '~/schema/client-financial.schema'
import freelancerFinancialService from '~/services/freelancer/financial.service'

export const getFreelancerFinancialOverview = async (req: Request, res: Response) => {
        const freelancerId = req.user?.id
        const filters = SpendingStatisticsQuerySchema.parse(req.query)
        const overview = await freelancerFinancialService.getFreelancerFinancialOverview(freelancerId!, filters)

        return res.status(StatusCodes.OK).json(overview)
}

