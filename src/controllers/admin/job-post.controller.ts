import { Request, Response } from 'express'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import {
        AdminJobActivityQuerySchema,
        AdminListJobPostQuerySchema,
        AdminRemoveJobAttachmentSchema,
        AdminUpdateJobPostStatusSchema
} from '~/schema/admin-job-post.schema'
import adminJobPostService from '~/services/admin-job-post.service'
import { ensureAdminUser } from './utils'

export const listAdminJobPosts = async (req: Request, res: Response) => {
        ensureAdminUser(req)

        const query = AdminListJobPostQuerySchema.parse(req.query)
        const result = await adminJobPostService.listJobPosts(query)

        return res.json(result)
}

export const getAdminJobPostDetail = async (req: Request, res: Response) => {
        ensureAdminUser(req)

        const { jobId } = req.params

        if (!jobId) {
                throw new BadRequestException('Thiếu jobId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const data = await adminJobPostService.getJobPostDetail(jobId)

        return res.json({ data })
}

export const updateAdminJobPostStatus = async (req: Request, res: Response) => {
        const admin = ensureAdminUser(req)
        const { jobId } = req.params

        if (!jobId) {
                throw new BadRequestException('Thiếu jobId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = AdminUpdateJobPostStatusSchema.parse(req.body)
        const data = await adminJobPostService.updateJobPostStatus(jobId, admin.id, payload)

        return res.json({ data })
}

export const removeAdminJobPostAttachment = async (req: Request, res: Response) => {
        const admin = ensureAdminUser(req)
        const { jobId, attachmentId } = req.params

        if (!jobId || !attachmentId) {
                throw new BadRequestException('Thiếu tham số jobId hoặc attachmentId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = AdminRemoveJobAttachmentSchema.parse(req.body ?? {})
        const data = await adminJobPostService.removeJobPostAttachment(jobId, attachmentId, admin.id, payload)

        return res.json({ data })
}

export const listAdminJobPostActivities = async (req: Request, res: Response) => {
        ensureAdminUser(req)

        const { jobId } = req.params

        if (!jobId) {
                throw new BadRequestException('Thiếu jobId', ErrorCode.PARAM_QUERY_ERROR)
        }

        const query = AdminJobActivityQuerySchema.parse(req.query)
        const result = await adminJobPostService.listJobActivityLogs(jobId, query)

        return res.json(result)
}
