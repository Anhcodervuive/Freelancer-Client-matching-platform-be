import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { Role } from '~/generated/prisma'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ErrorCode } from '~/exceptions/root'
import { AdminReviewListQuerySchema, AdminReviewIdParamSchema } from '~/schema/admin-review.schema'
import adminReviewService from '~/services/admin-review.service'

const requireAdmin = (req: Request) => {
	const user = req.user
	if (!user || user.role !== Role.ADMIN) {
		throw new UnauthorizedException('Bạn không có quyền truy cập', ErrorCode.UNAUTHORIED)
	}
	return user
}

export const listReviews = async (req: Request, res: Response) => {
	requireAdmin(req)
	const query = AdminReviewListQuerySchema.parse(req.query)
	const result = await adminReviewService.listReviews(query)
	res.status(StatusCodes.OK).json(result)
}

export const getReviewDetail = async (req: Request, res: Response) => {
	requireAdmin(req)
	const { reviewId } = AdminReviewIdParamSchema.parse(req.params)
	const result = await adminReviewService.getReviewDetail(reviewId)
	res.status(StatusCodes.OK).json(result)
}

export const getReviewStats = async (req: Request, res: Response) => {
	requireAdmin(req)
	const result = await adminReviewService.getReviewStats()
	res.status(StatusCodes.OK).json(result)
}

export const getUserReviewSummary = async (req: Request, res: Response) => {
	requireAdmin(req)
	const userId = req.params.userId
	if (!userId) {
		throw new UnauthorizedException('User ID is required', ErrorCode.UNAUTHORIED)
	}
	const result = await adminReviewService.getUserReviewSummary(userId)
	res.status(StatusCodes.OK).json(result)
}

export default {
	listReviews,
	getReviewDetail,
	getReviewStats,
	getUserReviewSummary
}
