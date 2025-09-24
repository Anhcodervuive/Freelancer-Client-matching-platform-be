import type { Express } from 'express'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreateJobPostSchema,
        JobPostFilterSchema,
        UpdateJobPostSchema
} from '~/schema/job-post.schema'
import jobPostService from '~/services/job-post.service'

const extractAttachmentFiles = (files: Request['files']): Express.Multer.File[] => {
        if (!files) return []
        if (Array.isArray(files)) {
                return files as Express.Multer.File[]
        }

        const map = files as Record<string, Express.Multer.File[] | undefined>
        const fromField = map.attachments

        if (!fromField || fromField.length === 0) {
                return []
        }

        return fromField
}

export const createJobPost = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để tạo job post', ErrorCode.UNAUTHORIED)
        }

        const payload = CreateJobPostSchema.parse(req.body)
        const attachmentFiles = extractAttachmentFiles(req.files)
        const jobPost = await jobPostService.createJobPost(userId, payload, { attachmentFiles })

        return res.status(StatusCodes.CREATED).json(jobPost)
}

export const updateJobPost = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { id } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để cập nhật job post', ErrorCode.UNAUTHORIED)
        }

        if (!id) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }

        const payload = UpdateJobPostSchema.parse(req.body)
        const attachmentFiles = extractAttachmentFiles(req.files)
        const jobPost = await jobPostService.updateJobPost(id, userId, payload, { attachmentFiles })

        return res.status(StatusCodes.OK).json(jobPost)
}

export const getJobPostDetail = async (req: Request, res: Response) => {
        const { id } = req.params

        if (!id) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }

        const jobPost = await jobPostService.getJobPostById(id, req.user?.id)

        return res.status(StatusCodes.OK).json(jobPost)
}

export const listJobPosts = async (req: Request, res: Response) => {
        const filters = JobPostFilterSchema.parse(req.query)
        const result = await jobPostService.listJobPosts(filters, req.user?.id)

        return res.status(StatusCodes.OK).json(result)
}

export const deleteJobPost = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { id } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xóa job post', ErrorCode.UNAUTHORIED)
        }

        if (!id) {
                throw new BadRequestException('Thiếu tham số job post id', ErrorCode.PARAM_QUERY_ERROR)
        }

        await jobPostService.deleteJobPost(id, userId)

        return res.status(StatusCodes.NO_CONTENT).send()
}
