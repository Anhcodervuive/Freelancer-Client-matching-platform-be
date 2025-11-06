import { z } from 'zod'

import { JobStatus } from '~/generated/prisma'
import { JobPostFilterSchema } from './job-post.schema'

const booleanParam = z.preprocess(value => {
        if (value === undefined || value === null || value === '') return undefined
        if (typeof value === 'boolean') return value
        if (typeof value === 'number') return value !== 0
        if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase()
                if (['true', '1', 'yes', 'y'].includes(normalized)) return true
                if (['false', '0', 'no', 'n'].includes(normalized)) return false
        }
        return value
}, z.boolean().optional())

export const AdminListJobPostQuerySchema = JobPostFilterSchema.omit({ mine: true }).extend({
        includeDeleted: booleanParam
})

export type AdminListJobPostQuery = z.infer<typeof AdminListJobPostQuerySchema>

export const AdminUpdateJobPostStatusSchema = z
        .object({
                status: z.nativeEnum(JobStatus),
                reason: z.string().trim().min(1).max(500).optional(),
                note: z.string().trim().min(1).max(1000).optional()
        })
        .strict()

export type AdminUpdateJobPostStatusInput = z.infer<typeof AdminUpdateJobPostStatusSchema>

export const AdminRemoveJobAttachmentSchema = z
        .object({
                reason: z.string().trim().min(1).max(500).optional(),
                note: z.string().trim().min(1).max(1000).optional()
        })
        .strict()

export type AdminRemoveJobAttachmentInput = z.infer<typeof AdminRemoveJobAttachmentSchema>

export const AdminJobActivityQuerySchema = z
        .object({
                page: z.coerce.number().int().min(1).default(1),
                limit: z.coerce.number().int().min(1).max(100).default(20)
        })
        .strict()

export type AdminJobActivityQuery = z.infer<typeof AdminJobActivityQuerySchema>
