import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { FreelancerJobPostFilterSchema } from '~/schema/job-post.schema'
import freelancerJobPostService from '~/services/freelancer/job-post.service'

export async function listPublicJobPosts(req: Request, res: Response) {
        const filters = FreelancerJobPostFilterSchema.parse(req.query)
        const viewerId = req.user?.id
        const result = await freelancerJobPostService.listJobPosts(filters, viewerId)
        res.status(StatusCodes.OK).json(result)
}

export async function getPublicJobPostDetail(req: Request, res: Response) {
        const jobId = req.params.id
        if (!jobId) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }
        const viewerId = req.user?.id
        const job = await freelancerJobPostService.getJobPostDetail(jobId, viewerId)
        res.status(StatusCodes.OK).json(job)
}
