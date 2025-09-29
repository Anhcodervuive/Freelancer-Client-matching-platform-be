import type { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { corsOptions } from '~/config/cors'

import { registerNotificationGateway } from './notifications/notification.gateway'
import { registerChatGateway } from './chat'

export const registerRealtime = (httpServer: HttpServer) => {
        const io = new SocketIOServer(httpServer, {
                cors: corsOptions
        })

        registerNotificationGateway(io)
        registerChatGateway(io)

        return io
}
