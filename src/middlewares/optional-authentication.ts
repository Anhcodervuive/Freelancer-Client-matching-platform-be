import { NextFunction, Request, Response } from 'express'
import { JWT_CONFIG_INFO } from '~/config/environment'
import { prismaClient } from '~/config/prisma-client'
import { JwtProvider } from '~/providers/jwt.provider'

const optionalAuthentication = async (req: Request, _res: Response, next: NextFunction) => {
        try {
                const token = req.cookies?.accessToken
                if (!token) {
                        delete req.user
                        req.decoded = undefined as any
                        return next()
                }

                const decoded = await JwtProvider.verifyToken(token, JWT_CONFIG_INFO.ACCESS_TOKEN_SECRET_SIGNATURE)
                const user = await prismaClient.user.findFirst({
                        where: { id: decoded.id! }
                })

                if (user) {
                        req.user = user
                        req.decoded = decoded
                } else {
                        delete req.user
                        req.decoded = undefined as any
                }
        } catch (error) {
                delete req.user
                req.decoded = undefined as any
        }

        next()
}

export default optionalAuthentication
