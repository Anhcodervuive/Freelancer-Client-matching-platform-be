import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { chooseRoleSchema } from '~/schema/profile.schema'
import profileService from '~/services/profile.service'

export const chooseRole = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const data = chooseRoleSchema.parse(req.body)

	// const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
	// if (req.user?.createdAt! > oneDayAgo) {
	// 	throw new BadRequestException("Role can'/t be edited", ErrorCode.USER_NOT_AUTHORITY)
	// }

	if (data.role === 'CLIENT') {
		if (req.user?.role === 'FREELANCER') {
			await profileService.deleteFreelancerProfile(userId!)
		} else if (req.user?.role === 'CLIENT') {
			return res.status(StatusCodes.OK).json({ message: 'Role updated!' })
		}
		await profileService.createClientProfile(userId!)
	} else {
		if (req.user?.role === 'CLIENT') {
			await profileService.deleteClientProfile(userId!)
		} else if (req.user?.role === 'FREELANCER') {
			return res.status(StatusCodes.OK).json({ message: 'Role updated!' })
		}
		await profileService.createFreelancerProfile(userId!)
	}

	return res.status(StatusCodes.OK).json({ message: 'Role updated!' })
}
