import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { CreateJobOfferSchema, JobOfferFilterSchema, UpdateJobOfferSchema } from '~/schema/job-offer.schema'
import jobOfferService from '~/services/client/job-offer.service'

export const createJobOffer = async (req: Request, res: Response) => {
	const userId = req.user?.id

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để tạo offer', ErrorCode.UNAUTHORIED)
	}

	console.log(req.body)
	const payload = CreateJobOfferSchema.parse(req.body)
	const offer = await jobOfferService.createJobOffer(userId, payload)

	return res.status(StatusCodes.CREATED).json(offer)
}

export const listJobOffers = async (req: Request, res: Response) => {
	const userId = req.user?.id

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem offer', ErrorCode.UNAUTHORIED)
	}
	const filters = JobOfferFilterSchema.parse(req.query)
	const result = await jobOfferService.listJobOffers(userId, filters)

	return res.status(StatusCodes.OK).json(result)
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

	const offer = await jobOfferService.getJobOfferDetail(userId, offerId)

	return res.status(StatusCodes.OK).json(offer)
}

export const updateJobOffer = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { offerId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để cập nhật offer', ErrorCode.UNAUTHORIED)
	}

	if (!offerId) {
		throw new BadRequestException('Thiếu tham số offerId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = UpdateJobOfferSchema.parse(req.body)
	const offer = await jobOfferService.updateJobOffer(userId, offerId, payload)

	return res.status(StatusCodes.OK).json(offer)
}

export const deleteJobOffer = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { offerId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xóa offer', ErrorCode.UNAUTHORIED)
	}

	if (!offerId) {
		throw new BadRequestException('Thiếu tham số offerId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await jobOfferService.deleteJobOffer(userId, offerId)

	return res.status(StatusCodes.NO_CONTENT).send()
}
