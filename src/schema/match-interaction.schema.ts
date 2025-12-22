import { z } from 'zod'

import { MatchInteractionSource, MatchInteractionType } from '~/generated/prisma'

export const RecordMatchInteractionSchema = z
        .object({
                type: z.nativeEnum(MatchInteractionType),
                source: z.nativeEnum(MatchInteractionSource).optional(),
                jobId: z.string().min(1).optional(),
                freelancerId: z.string().min(1).optional(),
                clientId: z.string().min(1).optional(),
                proposalId: z.string().min(1).optional(),
                invitationId: z.string().min(1).optional(),
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
