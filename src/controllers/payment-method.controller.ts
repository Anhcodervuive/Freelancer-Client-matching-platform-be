import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { InternalServerException } from '~/exceptions/internal-server'
import { ErrorCode } from '~/exceptions/root'
import { AddPmSchema, UpdatePmSchema } from '~/schema/payment-method.schema'
import paymentMethodService from '~/services/payment-method.service'

export const getListPaymentMethod = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const result = await paymentMethodService.getAllByUserId(userId!)

	return res.status(StatusCodes.OK).json(result)
}

export const setUpBillingIntent = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { usage }: { usage?: 'on_session' | 'off_session' } = req.body || {}
	const result = await paymentMethodService.createSetupIntentForUser(userId!, { usage: usage! })
	if (!result.clientSecret) {
		throw new InternalServerException('Failed to create SetupIntent client secret', ErrorCode.INTERNAL_SERVER_ERROR)
	}
	res.status(StatusCodes.OK).json(result)
}

export const addPaymentMethod = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const data = AddPmSchema.parse(req.body)

	const result = await paymentMethodService.addPaymentMethod(userId!, data)

	return res.status(StatusCodes.CREATED).json(result)
}

export const getPaymentMethodDetail = async (req: Request, res: Response) => {
	const { id: pmId } = req.params

	if (!pmId) {
		throw new BadRequestException('Missing pmId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const paymentMethod = await paymentMethodService.getPaymentMethodById(pmId!)
	console.log(paymentMethod)
	return res.status(StatusCodes.OK).json(paymentMethod)
}

export const updatePaymentMethod = async (req: Request, res: Response) => {
	const { id: pmId } = req.params

	if (!pmId) {
		throw new BadRequestException('Missing pmId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const data = UpdatePmSchema.parse(req.body)

	const updatedPm = await paymentMethodService.updatePaymentMethod(pmId!, data)

	return res.status(StatusCodes.OK).json(updatedPm)
}

export const setDefaultPaymentMethod = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { id: pmId } = req.params

	if (!pmId) {
		throw new BadRequestException('Missing pmId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await paymentMethodService.setDefaultPaymentMethod(userId!, pmId)

	return res.status(StatusCodes.OK).json({
		message: 'sync successfully!'
	})
}

export const deletePaymentMethod = async (req: Request, res: Response) => {
	const userId = req.user?.id

	const { id: pmId } = req.params

	if (!pmId) {
		throw new BadRequestException('Missing pmId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await paymentMethodService.removePaymentMethod(userId!, pmId)

	return res.status(StatusCodes.OK).json({
		message: 'delete successfully!'
	})
}
