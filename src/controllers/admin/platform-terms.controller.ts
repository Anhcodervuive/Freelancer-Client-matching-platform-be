import { StatusCodes } from 'http-status-codes'
import { Request, Response } from 'express'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import {
        CreatePlatformTermsSchema,
        PlatformTermsListQuerySchema,
        UpdatePlatformTermsSchema
} from '~/schema/platform-terms.schema'
import platformTermsService from '~/services/platform-terms.service'
import { ensureAdminUser } from './utils'

export const listPlatformTerms = async (req: Request, res: Response) => {
        ensureAdminUser(req)

        const query = PlatformTermsListQuerySchema.parse(req.query)
        const result = await platformTermsService.listTerms(query)

        return res.status(StatusCodes.OK).json(result)
}

export const getPlatformTermsDetail = async (req: Request, res: Response) => {
        ensureAdminUser(req)

        const { termsId } = req.params

        if (!termsId) {
                throw new BadRequestException('Thiếu tham số termsId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const data = await platformTermsService.getTermById(termsId)

        return res.status(StatusCodes.OK).json({ data })
}

export const createPlatformTerms = async (req: Request, res: Response) => {
        const admin = ensureAdminUser(req)

        const payload = CreatePlatformTermsSchema.parse(req.body)
        const data = await platformTermsService.createTerms(admin.id, payload)

        return res.status(StatusCodes.CREATED).json({ data })
}

export const updatePlatformTerms = async (req: Request, res: Response) => {
        const admin = ensureAdminUser(req)
        const { termsId } = req.params

        if (!termsId) {
                throw new BadRequestException('Thiếu tham số termsId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = UpdatePlatformTermsSchema.parse(req.body)
        const data = await platformTermsService.updateTerms(termsId, admin.id, payload)

        return res.status(StatusCodes.OK).json({ data })
}
