import { StatusCodes } from 'http-status-codes'
import { Request, Response } from 'express'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { PlatformTermsVersionParamSchema } from '~/schema/platform-terms.schema'
import platformTermsService from '~/services/platform-terms.service'

export const getLatestPlatformTerms = async (_req: Request, res: Response) => {
        const data = await platformTermsService.getLatestActiveTerms()

        return res.status(StatusCodes.OK).json({ data })
}

export const getPlatformTermsByVersion = async (req: Request, res: Response) => {
        const parsed = PlatformTermsVersionParamSchema.safeParse(req.params)

        if (!parsed.success) {
                throw new BadRequestException('Tham số version không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        const data = await platformTermsService.getPublicTermsByVersion(parsed.data.version)

        return res.status(StatusCodes.OK).json({ data })
}
