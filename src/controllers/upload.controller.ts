import { Request, Response } from 'express'
import { cloudinarySignSchema, r2PresignSchema } from '~/schema/upload.schema'
import uploadService from '~/services/upload.service'

export const getCloudinarySign = async (req: Request, res: Response) => {
	const body = cloudinarySignSchema.parse(req.body ?? {})

	const userId = req?.user?.id

	const result = await uploadService.getCloudinarySign(userId!, body)

	return res.json(result)
}

export const getR2Sign = async (req: Request, res: Response) => {
	const body = r2PresignSchema.parse(req.body ?? {})

	const userId = req?.user?.id

	const result = await uploadService.getR2Sign(userId!, body)

	return res.json(result)
}
