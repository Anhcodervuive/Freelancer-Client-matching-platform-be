import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { JobProposalFilterSchema } from '~/schema/job-proposal.schema'
import clientJobProposalService from '~/services/client/job-proposal.service'

export const listJobProposalsForJob = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { jobId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem proposal', ErrorCode.UNAUTHORIED)
        }

        if (!jobId) {
                throw new BadRequestException('Thiếu tham số jobId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const filters = JobProposalFilterSchema.parse(req.query)
        const result = await clientJobProposalService.listJobProposalsForJob(userId, jobId, filters)

        return res.status(StatusCodes.OK).json(result)
}
