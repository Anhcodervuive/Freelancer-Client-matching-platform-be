import { EventEmitter } from 'node:events'

import type { Notification, Profile } from '~/generated/prisma'

export const NotificationRealtimeEvent = {
	CREATED: 'notification.created'
} as const

type NotificationRealtimeEventPayloads = {
	[NotificationRealtimeEvent.CREATED]: any
}

export const notificationEventEmitter = new EventEmitter()

notificationEventEmitter.setMaxListeners(0)
