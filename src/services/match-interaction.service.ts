import { Prisma, Role } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { matchInteractionQueue } from '~/queues/match-interaction.queue'
import { RecordMatchInteractionInput, RecordMatchInteractionSchema } from '~/schema/match-interaction.schema'

export type RecordMatchInteractionParams = RecordMatchInteractionInput & {
        actorProfileId?: string | null
        actorRole?: Role | null
}

const matchInteractionService = {
        async recordInteraction(params: RecordMatchInteractionParams) {
                const { actorProfileId, actorRole, ...input } = params
                const parsed = RecordMatchInteractionSchema.parse(input)

                await matchInteractionQueue.add('record-interaction', {
                        ...parsed,
                        occurredAt: parsed.occurredAt?.toISOString(),
                        metadata: parsed.metadata,
                        actorProfileId: actorProfileId ?? null,
                        actorRole: actorRole ?? null
                })
        },

        async persistInteraction(params: RecordMatchInteractionParams) {
                const {
                        actorProfileId,
                        actorRole,
                        occurredAt,
                        metadata,
                        source,
                        type,
                        jobId,
                        freelancerId,
                        clientId,
                        proposalId,
                        invitationId
                } = params

                const data: Prisma.MatchInteractionUncheckedCreateInput = {
                        type,
                        occurredAt: occurredAt ?? new Date(),
                        jobId: jobId ?? null,
                        freelancerId: freelancerId ?? null,
                        clientId: clientId ?? null,
                        proposalId: proposalId ?? null,
                        invitationId: invitationId ?? null,
                        actorProfileId: actorProfileId ?? null,
                        actorRole: actorRole ?? null
                }

                if (source) {
                        data.source = source
                }

                if (metadata !== undefined) {
                        data.metadata = metadata as Prisma.InputJsonValue
                }

                return prismaClient.matchInteraction.create({ data })
        }
}

export default matchInteractionService
