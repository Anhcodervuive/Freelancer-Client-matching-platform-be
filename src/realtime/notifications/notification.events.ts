import { EventEmitter } from 'node:events'

import type { Notification } from '~/generated/prisma'

export const NotificationRealtimeEvent = {
	CREATED: 'notification.created'
} as const

type NotificationRealtimeEventPayloads = {
	[NotificationRealtimeEvent.CREATED]: Notification
}

export const notificationEventEmitter = new EventEmitter()

notificationEventEmitter.setMaxListeners(0)
