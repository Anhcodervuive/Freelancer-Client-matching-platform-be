import type { Server } from 'socket.io'

import { authenticateSocket } from '../common/auth.middleware'
import {
        JobOfferRealtimeEvent,
        jobOfferEventEmitter,
        type JobOfferRealtimeEventPayloads
} from './job-offer.events'

const JOB_OFFER_NAMESPACE = '/job-offers'

const buildUserRoom = (userId: string) => `${JOB_OFFER_NAMESPACE}:user:${userId}`

export const registerJobOfferGateway = (io: Server) => {
        const namespace = io.of(JOB_OFFER_NAMESPACE)

        namespace.use(async (socket, next) => {
                try {
                        await authenticateSocket(socket, next)
                } catch (error) {
                        next(error as Error)
                }
        })

        namespace.on('connection', socket => {
                const user = socket.data.user

                if (!user) {
                        socket.disconnect(true)
                        return
                }

                socket.join(buildUserRoom(user.id))
        })

        const handleOfferSent = ({ recipientId, offer }: JobOfferRealtimeEventPayloads[(typeof JobOfferRealtimeEvent)['SENT']]) => {
                const room = buildUserRoom(recipientId)
                namespace.to(room).emit('job-offer:sent', offer)
        }

        jobOfferEventEmitter.on(JobOfferRealtimeEvent.SENT, handleOfferSent)

        io.of(JOB_OFFER_NAMESPACE).server.on('close', () => {
                jobOfferEventEmitter.off(JobOfferRealtimeEvent.SENT, handleOfferSent)
        })
}
