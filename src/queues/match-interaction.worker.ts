import { Worker } from 'bullmq'

import { connection } from './redis'
import matchInteractionService from '~/services/match-interaction.service'
import { RecordMatchInteractionSchema } from '~/schema/match-interaction.schema'

new Worker(
        'match-interaction',
        async job => {
                const { actorProfileId, actorRole, ...input } = job.data ?? {}
                const parsed = RecordMatchInteractionSchema.parse(input)

                await matchInteractionService.persistInteraction({
                        ...parsed,
                        actorProfileId: actorProfileId ?? null,
                        actorRole: actorRole ?? null
                })
        },
        { connection }
)

console.log('Match interaction worker started...')
