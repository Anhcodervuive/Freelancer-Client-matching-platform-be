import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ErrorCode } from '~/exceptions/root'
import { Role } from '~/generated/prisma'
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

export async function saveJobPost(req: Request, res: Response) {
        const requester = req.user
        if (!requester) {
                throw new UnauthorizedException('Bạn cần đăng nhập để lưu job', ErrorCode.UNAUTHORIED)
        }
        if (requester.role !== Role.FREELANCER) {
                throw new UnauthorizedException('Chỉ freelancer mới có thể lưu job', ErrorCode.USER_NOT_AUTHORITY)
        }

        const jobId = req.params.id
        if (!jobId) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }

        await freelancerJobPostService.saveJobPost(jobId, requester.id)
        res.status(StatusCodes.NO_CONTENT).send()
}

export async function unsaveJobPost(req: Request, res: Response) {
        const requester = req.user
        if (!requester) {
                throw new UnauthorizedException('Bạn cần đăng nhập để bỏ lưu job', ErrorCode.UNAUTHORIED)
        }
        if (requester.role !== Role.FREELANCER) {
                throw new UnauthorizedException('Chỉ freelancer mới có thể bỏ lưu job', ErrorCode.USER_NOT_AUTHORITY)
        }

        const jobId = req.params.id
        if (!jobId) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }

        await freelancerJobPostService.unsaveJobPost(jobId, requester.id)
        res.status(StatusCodes.NO_CONTENT).send()
}
