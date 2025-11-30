import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnprocessableEntityException } from '~/exceptions/validation'
import { UpdateProfileSchema } from '~/schema/profile.schema'
import profileService from '~/services/profile.service'
import assetService from '~/services/asset.service'
import matchInteractionService from '~/services/match-interaction.service'

export const getProfile = async (req: Request, res: Response) => {
	const { id: userId } = req.params
	if (!userId) throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)
	const currentUser = req.user
	const interactionSource = req.query.interactionSource as string

	const profile = await profileService.getOrCreateMyProfile(userId)
	const avatarUrl = await assetService.getProfileAvatarUrl(userId)
	if (interactionSource) {
		await matchInteractionService.recordInteraction({
			type: 'PROFILE_VIEW',
			freelancerId: userId,
			source: interactionSource === 'search' ? 'SEARCH' : 'RECOMMENDATION',
			actorProfileId: currentUser?.id ?? '',
			actorRole: currentUser?.role === 'FREELANCER' ? 'FREELANCER' : 'CLIENT'
		})
	}
	return res.status(StatusCodes.OK).json({ ...profile, avatar: avatarUrl })
}

export const updateMyProfile = async (req: Request, res: Response) => {
	const userId = req.user?.id
	if (!userId) throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)

	const parsed = UpdateProfileSchema.parse(req.body)

	const profile = await profileService.updateMyProfile(userId, parsed)
	return res.status(StatusCodes.OK).json(profile)
}

export const uploadAvatar = async (req: Request, res: Response) => {
	const userId = req.user?.id
	if (!userId) throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)

	const file = req.file
	if (!file) {
		throw new UnprocessableEntityException('No file provided', ErrorCode.UNPROCESSABLE_ENTITY)
	}

	const asset = await assetService.replaceProfileAvatar(userId, file)

	return res.status(StatusCodes.OK).json({
		message: 'Upload avatar successfully!',
		avatarUrl: asset.url
	})
}
