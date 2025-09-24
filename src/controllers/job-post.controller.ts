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

const ATTACHMENT_FILE_FIELD_NAMES = new Set([
        'attachmentFiles',
        'attachmentFiles[]',
        'attachments',
        'attachments[]'
])

const extractAttachmentFiles = (files: Request['files']): Express.Multer.File[] => {
        if (!files) return []

        if (Array.isArray(files)) {
                return (files as Express.Multer.File[]).filter(file =>
                        ATTACHMENT_FILE_FIELD_NAMES.has(file.fieldname)
                )
        }

        const map = files as Record<string, Express.Multer.File[] | undefined>

        return Array.from(ATTACHMENT_FILE_FIELD_NAMES).flatMap(fieldName => map[fieldName] ?? [])
}

const tryParseJson = (value: string): unknown => {
        if (!value) return undefined
        try {
                return JSON.parse(value)
        } catch (error) {
                return undefined
        }
}

const normalizeAttachmentIdInput = (input: unknown): string[] => {
        if (input === undefined || input === null) return []

        if (Array.isArray(input)) {
                return input.flatMap(item => normalizeAttachmentIdInput(item))
        }

        if (typeof input === 'string') {
                const trimmed = input.trim()

                if (!trimmed) return []

                const maybeJson = tryParseJson(trimmed)
                if (Array.isArray(maybeJson)) {
                        return normalizeAttachmentIdInput(maybeJson)
                }

                if (trimmed.includes(',')) {
                        return trimmed
                                .split(',')
                                .map(part => part.trim())
                                .filter(Boolean)
                }

                return [trimmed]
        }

        return []
}

const ATTACHMENT_BODY_FIELD_NAMES = ['attachments', 'attachments[]'] as const

const sanitizeAttachmentIdsInBody = (
        body: Request['body'],
        attachmentFiles: readonly Express.Multer.File[]
) => {
        if (!body || typeof body !== 'object') return

        const container = body as Record<string, unknown>
        const collectedValues = ATTACHMENT_BODY_FIELD_NAMES.flatMap(fieldName => {
                const raw = container[fieldName]
                if (raw === undefined) return []
                delete container[fieldName]
                return [raw]
        })

        if (collectedValues.length === 0) return

        const normalized = collectedValues.flatMap(value => normalizeAttachmentIdInput(value))

        if (normalized.length === 0) {
                delete container.attachments
                return
        }

        const uploadedNames = new Set(
                attachmentFiles.map(file => file.originalname).filter(Boolean)
        )

        const filtered = normalized.filter(value => !uploadedNames.has(value))

        if (filtered.length === 0) {
                delete container.attachments
        } else {
                container.attachments = filtered
        }
}

export const createJobPost = async (req: Request, res: Response) => {
        const userId = req.user?.id

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để tạo job post', ErrorCode.UNAUTHORIED)
        }

        const attachmentFiles = extractAttachmentFiles(req.files)
        sanitizeAttachmentIdsInBody(req.body, attachmentFiles)
        const payload = CreateJobPostSchema.parse(req.body)
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

        const attachmentFiles = extractAttachmentFiles(req.files)
        sanitizeAttachmentIdsInBody(req.body, attachmentFiles)
        const payload = UpdateJobPostSchema.parse(req.body)
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
