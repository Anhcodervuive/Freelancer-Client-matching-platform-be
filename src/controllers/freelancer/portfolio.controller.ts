import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        CreatePortfolioSchema,
        UpdatePortfolioSchema
} from '~/schema/portfolio.schema'
import portfolioService from '~/services/freelancer/portfolio.service'

export const listPortfolios = async (req: Request, res: Response) => {
        const { freelancerId } = req.params
        if (!freelancerId) {
                throw new BadRequestException('Freelancer id không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        const includePrivate = req.user?.id === freelancerId
        const portfolios = await portfolioService.listPortfolios(freelancerId, includePrivate)

        return res.status(StatusCodes.OK).json(portfolios)
}

export const getPortfolioDetail = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        const includePrivate = req.user?.id === freelancerId
        const portfolio = await portfolioService.getPortfolioById(freelancerId, portfolioId, includePrivate)

        return res.status(StatusCodes.OK).json(portfolio)
}

const assertOwner = (freelancerId: string, userId?: string) => {
        if (!userId || userId !== freelancerId) {
                throw new UnauthorizedException('Bạn không có quyền thao tác portfolio này', ErrorCode.USER_NOT_AUTHORITY)
        }
}

export const createPortfolio = async (req: Request, res: Response) => {
        const { freelancerId } = req.params
        if (!freelancerId) {
                throw new BadRequestException('Freelancer id không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        const payload = CreatePortfolioSchema.parse(req.body)
        const result = await portfolioService.createPortfolio(freelancerId, payload, req.user!.id)

        return res.status(StatusCodes.CREATED).json(result)
}

export const updatePortfolio = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        const payload = UpdatePortfolioSchema.parse(req.body)
        const result = await portfolioService.updatePortfolio(freelancerId, portfolioId, payload, req.user!.id)

        return res.status(StatusCodes.OK).json(result)
}

export const deletePortfolio = async (req: Request, res: Response) => {
        const { freelancerId, portfolioId } = req.params
        if (!freelancerId || !portfolioId) {
                throw new BadRequestException('Thiếu tham số truy vấn', ErrorCode.PARAM_QUERY_ERROR)
        }

        assertOwner(freelancerId, req.user?.id)

        await portfolioService.deletePortfolio(freelancerId, portfolioId, req.user!.id)

        return res.status(StatusCodes.NO_CONTENT).send()
}
