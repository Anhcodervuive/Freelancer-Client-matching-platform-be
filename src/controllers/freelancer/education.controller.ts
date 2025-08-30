import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { AddOneEducationSchema, UpdateOneEducationSchema } from '~/schema/freelancer.schema'
import freelancerEducationService from '~/services/freelancer/education.service'

export const getAllEducationOfFreelancer = async (req: Request, res: Response) => {
	const { userId } = req.params
	if (!userId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}

	const educations = await freelancerEducationService.getAllByFreelancerId(userId)

	return res.status(StatusCodes.OK).json(educations)
}

export const addOneEducation = async (req: Request, res: Response) => {
	const { userId } = req.params
	if (!userId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}

	const data = AddOneEducationSchema.parse(req.body)

	const result = await freelancerEducationService.addOne(data, userId)

	return res.status(StatusCodes.CREATED).json(result)
}

export const updateOneEducation = async (req: Request, res: Response) => {
	const { userId, educationId } = req.params

	if (!userId || !educationId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}

	// Xử lý phân quyền

	const data = UpdateOneEducationSchema.parse(req.body)

	await freelancerEducationService.updateOne(data, educationId)

	return res.status(StatusCodes.OK).json({ messgae: 'Updated!' })
}

export const deleteOneEducation = async (req: Request, res: Response) => {
	const { userId, educationId } = req.params

	if (!userId || !educationId) {
		throw new BadRequestException('User id not found!', ErrorCode.PARAM_QUERY_ERROR)
	}

	await freelancerEducationService.deleteOne(educationId)

	return res.status(StatusCodes.OK).json({ messgae: 'Deleted!' })
}
