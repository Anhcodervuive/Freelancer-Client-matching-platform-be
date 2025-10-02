import { EventEmitter } from 'node:events'

export const ChatRealtimeEvent = {
        THREAD_CREATED: 'chat.thread.created'
} as const

export type ChatParticipantRole = 'CLIENT' | 'FREELANCER' | 'ADMIN'

export type ChatThreadType = 'PROJECT' | 'ADMIN_CLIENT' | 'ADMIN_FREELANCER'

export type ChatThreadParticipantSummary = {
        id: string
        userId: string
        role: ChatParticipantRole
        profile: {
                firstName: string | null
                lastName: string | null
        }
        avatar: string | null
}

export type ChatThreadSummary = {
        id: string
        type: ChatThreadType
        subject: string | null
        jobPostId: string | null
        contractId: string | null
        participants: ChatThreadParticipantSummary[]
}

type ChatRealtimeEventPayloads = {
        [ChatRealtimeEvent.THREAD_CREATED]: {
                thread: ChatThreadSummary
        }
}

class ChatEventEmitter extends EventEmitter {
        emit<Event extends keyof ChatRealtimeEventPayloads>(
                eventName: Event,
                payload: ChatRealtimeEventPayloads[Event]
        ): boolean {
                return super.emit(eventName, payload)
        }

        on<Event extends keyof ChatRealtimeEventPayloads>(
                eventName: Event,
                listener: (payload: ChatRealtimeEventPayloads[Event]) => void
        ): this {
                return super.on(eventName, listener)
        }

        off<Event extends keyof ChatRealtimeEventPayloads>(
                eventName: Event,
                listener: (payload: ChatRealtimeEventPayloads[Event]) => void
        ): this {
                return super.off(eventName, listener)
        }
}

export const chatEventEmitter = new ChatEventEmitter()
chatEventEmitter.setMaxListeners(0)

export type { ChatRealtimeEventPayloads }
