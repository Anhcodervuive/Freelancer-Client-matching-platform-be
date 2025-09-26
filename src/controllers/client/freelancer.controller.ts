import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ErrorCode } from '~/exceptions/root'
import { ClientFreelancerFilterSchema } from '~/schema/freelancer.schema'
import clientFreelancerService from '~/services/client/freelancer.service'

export async function listFreelancersForClient(req: Request, res: Response) {
        const userId = req.user?.id
        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem danh sách freelancer', ErrorCode.UNAUTHORIED)
        }

        const filters = ClientFreelancerFilterSchema.parse(req.query)
        const result = await clientFreelancerService.listFreelancers(userId, filters)
        res.status(StatusCodes.OK).json(result)
}
