import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        FreelancerJobOfferFilterSchema,
        RespondJobOfferSchema
} from '~/schema/job-offer.schema'
import freelancerJobOfferService from '~/services/freelancer/job-offer.service'

export const listJobOffers = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem offer', ErrorCode.UNAUTHORIED)
        }

        const filters = FreelancerJobOfferFilterSchema.parse(req.query)
        const offers = await freelancerJobOfferService.listJobOffers(userId, filters)

        return res.status(StatusCodes.OK).json(offers)
}

export const getJobOfferDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { offerId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem offer', ErrorCode.UNAUTHORIED)
        }

        if (!offerId) {
                throw new BadRequestException('Thiếu tham số offerId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const offer = await freelancerJobOfferService.getJobOfferDetail(userId, offerId)

        return res.status(StatusCodes.OK).json(offer)
}

export const respondToJobOffer = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { offerId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để phản hồi offer', ErrorCode.UNAUTHORIED)
        }

        if (!offerId) {
                throw new BadRequestException('Thiếu tham số offerId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = RespondJobOfferSchema.parse(req.body)
        const offer = await freelancerJobOfferService.respondToJobOffer(userId, offerId, payload)

        return res.status(StatusCodes.OK).json(offer)
}
