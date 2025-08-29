import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import freelancerLanguageService from '~/services/freelancerLanguage.service'
import { AddOneSchema } from '~/schema/freelancerLanguage.schema'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'

function ensureOwnerOrAdmin(req: Request, targetUserId: string) {
	const requester = req.user
	if (!requester) throw new UnauthorizedException('Unauthorized', ErrorCode.UNAUTHORIED)

	if (requester.role === 'ADMIN') return

	if (requester.id !== targetUserId) {
		throw new UnauthorizedException('You are not allowed to perform this action', ErrorCode.UNAUTHORIED)
	}
}

export async function getAllFreelancerLanguages(req: Request, res: Response) {
	const { userId } = req.params
	if (!userId) throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)

	const data = await freelancerLanguageService.getAll(userId)
	res.status(StatusCodes.OK).json(data)
}

export async function addOneFreelancerLanguage(req: Request, res: Response) {
	const { userId } = req.params
	if (!userId) throw new BadRequestException('Missing userId', ErrorCode.PARAM_QUERY_ERROR)

	ensureOwnerOrAdmin(req, userId)

	const { languageCode, proficiency } = AddOneSchema.parse(req.body)
	const item = await freelancerLanguageService.addOne(userId, languageCode, proficiency)

	res.status(StatusCodes.OK).json(item)
}

export async function removeOneFreelancerLanguage(req: Request, res: Response) {
	const { userId, code } = req.params
	if (!userId || !code) {
		throw new BadRequestException('Missing userId or code', ErrorCode.PARAM_QUERY_ERROR)
	}

	ensureOwnerOrAdmin(req, userId)

	const result = await freelancerLanguageService.removeOne(userId, code)
	res.status(StatusCodes.OK).json(result)
}
