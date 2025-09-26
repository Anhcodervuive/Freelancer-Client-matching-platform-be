import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
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

export async function getFreelancerDetailForClient(req: Request, res: Response) {
        const userId = req.user?.id
        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem freelancer', ErrorCode.UNAUTHORIED)
        }

        const freelancerId = req.params.freelancerId
        if (!freelancerId) {
                throw new BadRequestException('Thiếu freelancerId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const result = await clientFreelancerService.getFreelancerDetail(userId, freelancerId)
        res.status(StatusCodes.OK).json(result)
}

export async function saveFreelancerForClient(req: Request, res: Response) {
        const userId = req.user?.id
        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để lưu freelancer', ErrorCode.UNAUTHORIED)
        }

        const freelancerId = req.params.freelancerId
        if (!freelancerId) {
                throw new BadRequestException('Thiếu freelancerId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await clientFreelancerService.saveFreelancer(userId, freelancerId)
        res.status(StatusCodes.NO_CONTENT).send()
}

export async function unsaveFreelancerForClient(req: Request, res: Response) {
        const userId = req.user?.id
        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để bỏ lưu freelancer', ErrorCode.UNAUTHORIED)
        }

        const freelancerId = req.params.freelancerId
        if (!freelancerId) {
                throw new BadRequestException('Thiếu freelancerId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await clientFreelancerService.unsaveFreelancer(userId, freelancerId)
        res.status(StatusCodes.NO_CONTENT).send()
}
