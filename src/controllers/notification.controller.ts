import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import notificationService from '~/services/notification.service'

export const deleteNotification = async (req: Request, res: Response) => {
        const userId = req.user?.id
        if (!userId) {
                throw new BadRequestException('Unauthorized', ErrorCode.UNAUTHORIED)
        }

        const { notificationId } = req.params
        if (!notificationId) {
                throw new BadRequestException('Missing notification id parameter', ErrorCode.PARAM_QUERY_ERROR)
        }

        const deleted = await notificationService.deleteNotification(userId, notificationId)

        if (!deleted) {
                throw new NotFoundException('Notification not found', ErrorCode.ITEM_NOT_FOUND)
        }

        return res.status(StatusCodes.OK).json({ message: 'Notification deleted' })
}
