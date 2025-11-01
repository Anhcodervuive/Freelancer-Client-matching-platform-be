import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { SpendingStatisticsQuerySchema } from '~/schema/client-financial.schema'
import clientFinancialService from '~/services/client/financial.service'

export const getClientSpendingStatistics = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const filters = SpendingStatisticsQuerySchema.parse(req.query)
        const statistics = await clientFinancialService.getSpendingStatistics(userId!, filters)

        return res.status(StatusCodes.OK).json(statistics)
}
