import type { User } from '../generated/prisma'

declare module 'socket.io' {
        interface SocketData {
                user?: User
        }
}

export {}
