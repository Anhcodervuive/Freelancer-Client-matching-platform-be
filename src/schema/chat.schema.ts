import { z } from 'zod'

import { ChatThreadType, Role } from '~/generated/prisma'

const booleanLikeSchema = z.preprocess(value => {
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

export const ChatThreadListQuerySchema = z
        .object({
                page: z.coerce.number().int().min(1).default(1),
                limit: z.coerce.number().int().min(1).max(100).default(20),
                type: z.nativeEnum(ChatThreadType).optional(),
                jobPostId: z.string().min(1).optional(),
                contractId: z.string().min(1).optional(),
                search: z.string().trim().min(1).optional(),
                participantRole: z.nativeEnum(Role).optional(),
                includeParticipants: booleanLikeSchema,
                includeLastMessage: booleanLikeSchema
        })
        .strict()

export type ChatThreadListQueryInput = z.infer<typeof ChatThreadListQuerySchema>

export const ChatMessageListQuerySchema = z
        .object({
                limit: z.coerce.number().int().min(1).max(100).default(20),
                cursor: z.string().min(1).optional(),
                direction: z.enum(['before', 'after']).default('before'),
                includeReceipts: booleanLikeSchema.default(false),
                includeAttachments: booleanLikeSchema.default(true)
        })
        .strict()

export type ChatMessageListQueryInput = z.infer<typeof ChatMessageListQuerySchema>

export const MarkThreadReadSchema = z
        .object({
                messageId: z.string().min(1).optional()
        })
        .strict()

export type MarkThreadReadInput = z.infer<typeof MarkThreadReadSchema>
