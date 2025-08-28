import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UpdateProfileSchema } from '~/schema/profile.schema'
import profileService from '~/services/profile.service'

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
	const userId = req.user?.id
	if (!userId) throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)

	const profile = await profileService.getOrCreateMyProfile(userId)
	return res.status(StatusCodes.OK).json(profile)
}

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
	const userId = req.user?.id
	if (!userId) throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)

	const parsed = UpdateProfileSchema.parse(req.body)

	const profile = await profileService.updateMyProfile(userId, parsed)
	return res.status(StatusCodes.OK).json(profile)
}
