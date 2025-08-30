import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UpdateFreelancerProfileSchema } from '~/schema/freelancer.schema'
import freelancerService from '~/services/freelancer/root.service'

export async function getFreelancerProfile(req: Request, res: Response) {
	const { userId } = req.params
	if (!userId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}
	const result = await freelancerService.getByUserId(userId)
	res.status(StatusCodes.OK).json(result)
}

export async function updateFreelancerProfile(req: Request, res: Response) {
	const { userId } = req.params
	if (!userId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}
	const body = UpdateFreelancerProfileSchema.parse(req.body)
	const freelancer = await freelancerService.updateBasicInfo(userId, body)
	res.status(StatusCodes.OK).json(freelancer)
}
