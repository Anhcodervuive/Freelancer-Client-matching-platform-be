import type { Server } from 'socket.io'

import type { Notification } from '~/generated/prisma'
import { NotificationStatus } from '~/generated/prisma'

import { authenticateSocket } from '../common/auth.middleware'
import { NotificationRealtimeEvent, notificationEventEmitter } from './notification.events'
import notificationService from '~/services/notification.service'

const NOTIFICATION_NAMESPACE = '/notifications'

const buildUserRoom = (userId: string) => `${NOTIFICATION_NAMESPACE}:user:${userId}`

export const registerNotificationGateway = (io: Server) => {
        const namespace = io.of(NOTIFICATION_NAMESPACE)

        namespace.use(async (socket, next) => {
                try {
                        await authenticateSocket(socket, next)
                } catch (error) {
                        next(error as Error)
                }
        })

        namespace.on('connection', async (socket) => {
                const user = socket.data.user

                if (!user) {
                        socket.disconnect(true)
                        return
                }

                const room = buildUserRoom(user.id)
                socket.join(room)

                try {
                        const recentNotifications = await notificationService.listRecentByRecipient(user.id)
                        const notificationsWithDelivery = await Promise.all(
                                recentNotifications.map(async (notification) => {
                                        if (notification.status !== NotificationStatus.PENDING) {
                                                return notification
                                        }

                                        try {
                                                return await notificationService.markAsDelivered(notification.id)
                                        } catch (error) {
                                                // eslint-disable-next-line no-console
                                                console.error('Failed to mark notification as delivered', error)
                                                return notification
                                        }
                                })
                        )

                        socket.emit('notification:recent', notificationsWithDelivery)
                } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to hydrate notifications for socket client', error)
                }
        })

        const handleNotificationCreated = async (notification: Notification) => {
                const room = buildUserRoom(notification.recipientId)
                let payload = notification

                if (notification.status === NotificationStatus.PENDING) {
                        try {
                                payload = await notificationService.markAsDelivered(notification.id)
                        } catch (error) {
                                // eslint-disable-next-line no-console
                                console.error('Failed to mark notification as delivered', error)
                        }
                }

                namespace.to(room).emit('notification:created', payload)
        }

        notificationEventEmitter.on(NotificationRealtimeEvent.CREATED, handleNotificationCreated)

        io.of(NOTIFICATION_NAMESPACE).server.on('close', () => {
                notificationEventEmitter.off(NotificationRealtimeEvent.CREATED, handleNotificationCreated)
        })
}
