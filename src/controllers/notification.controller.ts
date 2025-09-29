import { Request, Response } from 'express'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import notificationService from '~/services/notification.service'

export const deleteNotification = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const { notificationId = '' } = req.params

	if (!notificationId) {
		throw new BadRequestException('Missing notificaition id', ErrorCode.PARAM_QUERY_ERROR)
	}
	const result = await notificationService.deleteNotification(userId!, notificationId)

	return res.json({ message: 'Notification deleted' })
}
