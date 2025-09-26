import { z } from 'zod'

import { MatchInteractionSource, MatchInteractionType } from '~/generated/prisma'

const uuidSchema = z.string().uuid()
const cuidSchema = z.string().cuid()

export const RecordMatchInteractionSchema = z
        .object({
                type: z.nativeEnum(MatchInteractionType),
                source: z.nativeEnum(MatchInteractionSource).optional(),
                jobId: cuidSchema.optional(),
                freelancerId: uuidSchema.optional(),
                clientId: uuidSchema.optional(),
                proposalId: cuidSchema.optional(),
                invitationId: cuidSchema.optional(),
                occurredAt: z.coerce.date().optional(),
                metadata: z.record(z.string(), z.any()).optional()
        })
        .refine(
                data => Boolean(data.jobId || data.freelancerId || data.clientId),
                {
                        message: 'Cần cung cấp ít nhất một trong các trường jobId, freelancerId hoặc clientId',
                        path: ['jobId']
                }
        )

export type RecordMatchInteractionInput = z.infer<typeof RecordMatchInteractionSchema>
