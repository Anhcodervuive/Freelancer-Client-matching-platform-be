import { Request, Response } from 'express'

import chatService from '~/services/chat.service'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'

export const listMyChatThreads = async (req: Request, res: Response) => {
        const userId = req.user?.id

        const result = await chatService.listThreads(userId!, req.query)

        return res.json(result)
}

export const getChatThreadDetail = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { threadId } = req.params

        if (!threadId) {
                throw new BadRequestException('Missing chat thread id', ErrorCode.PARAM_QUERY_ERROR)
        }

        const thread = await chatService.getThreadById(userId!, threadId)

        return res.json(thread)
}

export const getChatThreadMessages = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { threadId } = req.params

        if (!threadId) {
                throw new BadRequestException('Missing chat thread id', ErrorCode.PARAM_QUERY_ERROR)
        }

        const result = await chatService.getThreadMessages(userId!, threadId, req.query)

        return res.json(result)
}

export const markChatThreadAsRead = async (req: Request, res: Response) => {
        const userId = req.user?.id
        const { threadId } = req.params

        if (!threadId) {
                throw new BadRequestException('Missing chat thread id', ErrorCode.PARAM_QUERY_ERROR)
        }

        const result = await chatService.markThreadAsRead(userId!, threadId, req.body)

        return res.json(result)
}
