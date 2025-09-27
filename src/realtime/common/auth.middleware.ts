import type { Socket } from 'socket.io'

import { JWT_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { JwtProvider } from '~/providers/jwt.provider'

const buildUnauthorizedError = () => new Error('Unauthorized socket connection')

const parseCookies = (cookieHeader: unknown): Record<string, string> => {
        if (typeof cookieHeader !== 'string' || cookieHeader.trim().length === 0) {
                return {}
        }

        return cookieHeader.split(';').reduce<Record<string, string>>((acc, cookiePart) => {
                const [rawName, ...rawValueParts] = cookiePart.split('=')
                if (!rawName || rawValueParts.length === 0) {
                        return acc
                }

                const name = rawName.trim()
                const value = rawValueParts.join('=').trim()

                if (name.length > 0 && value.length > 0) {
                        acc[name] = decodeURIComponent(value)
                }

                return acc
        }, {})
}

const extractToken = (socket: Socket): string | undefined => {
        const authToken = socket.handshake.auth?.token
        if (typeof authToken === 'string' && authToken.trim().length > 0) {
                return authToken
        }

        const header = socket.handshake.headers?.authorization
        if (typeof header === 'string' && header.startsWith('Bearer ')) {
                return header.slice(7)
        }

        const cookies = parseCookies(socket.handshake.headers?.cookie)
        const cookieToken = cookies.accessToken
        if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
                return cookieToken
        }

        return undefined
}

export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
        try {
                const token = extractToken(socket)

                if (!token) {
                        return next(buildUnauthorizedError())
                }

                const decoded = await JwtProvider.verifyToken(token, JWT_CONFIG_INFO.ACCESS_TOKEN_SECRET_SIGNATURE)

                const user = await prismaClient.user.findUnique({
                        where: { id: decoded.id }
                })

                if (!user) {
                        return next(buildUnauthorizedError())
                }

                socket.data.user = user

                return next()
        } catch (error) {
                return next(buildUnauthorizedError())
        }
}
