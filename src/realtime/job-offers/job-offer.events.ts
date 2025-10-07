import { EventEmitter } from 'node:events'

import type { SerializedJobOffer } from '~/services/job-offer/shared'

export const JobOfferRealtimeEvent = {
        SENT: 'job-offer.sent'
} as const

type JobOfferRealtimeEventPayloads = {
        [JobOfferRealtimeEvent.SENT]: {
                recipientId: string
                offer: SerializedJobOffer
        }
}

class JobOfferEventEmitter extends EventEmitter {
        emit<Event extends keyof JobOfferRealtimeEventPayloads>(
                eventName: Event,
                payload: JobOfferRealtimeEventPayloads[Event]
        ): boolean {
                return super.emit(eventName, payload)
        }

        on<Event extends keyof JobOfferRealtimeEventPayloads>(
                eventName: Event,
                listener: (payload: JobOfferRealtimeEventPayloads[Event]) => void
        ): this {
                return super.on(eventName, listener)
        }

        off<Event extends keyof JobOfferRealtimeEventPayloads>(
                eventName: Event,
                listener: (payload: JobOfferRealtimeEventPayloads[Event]) => void
        ): this {
                return super.off(eventName, listener)
        }
}

export const jobOfferEventEmitter = new JobOfferEventEmitter()

jobOfferEventEmitter.setMaxListeners(0)

export type { JobOfferRealtimeEventPayloads }
