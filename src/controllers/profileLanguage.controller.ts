import { Request, Response } from 'express'
import profileLanguageSerivce from '~/services/profileLanguage.service'
import { AddOneSchema } from '~/schema/profileLanguage.schema'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { StatusCodes } from 'http-status-codes'

function ensureOwnerOrAdmin(req: Request, res: Response) {
	const requesterId = (req as any).user?.id
	const role = (req as any).user?.role
	const userId = req.params.userId
	if (role === 'ADMIN') return
	if (!requesterId || requesterId !== userId) {
		// res.status(403).json({ message: 'Forbidden' })
		throw new Error('Forbidden')
	}
}

export async function getAllProfileLanguage(req: Request, res: Response) {
	const { userId } = req.params

	if (!userId) {
		throw new BadRequestException('User id not founded', ErrorCode.PARAM_QUERY_ERROR)
	}

	const data = await profileLanguageSerivce.getAll(userId)

	return res.status(StatusCodes.OK).json(data)
}

export async function addOneProfileLanguage(req: Request, res: Response) {
	ensureOwnerOrAdmin(req, res)
	const { userId } = req.params

	if (!userId) {
		throw new BadRequestException('User id not founded', ErrorCode.PARAM_QUERY_ERROR)
	}

	const data = AddOneSchema.parse(req.body)

	const { languageCode, proficiency } = data
	const item = await profileLanguageSerivce.addOne(userId, languageCode, proficiency)
	res.status(StatusCodes.OK).json(item)
}

export async function removeProfileLanguage(req: Request, res: Response) {
	ensureOwnerOrAdmin(req, res)
	const { userId, code } = req.params
	if (!userId || !code) {
		throw new BadRequestException('User id or code not founded', ErrorCode.PARAM_QUERY_ERROR)
	}
	const result = await profileLanguageSerivce.removeOne(userId, code)
	res.status(StatusCodes.OK).json(result)
}
