import type { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { Role } from '~/generated/prisma'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ErrorCode } from '~/exceptions/root'
import { AdminContractListQuerySchema, AdminContractDetailParamsSchema } from '~/schema/admin-contract.schema'
import adminContractService from '~/services/admin-contract.service'

const requireAdmin = (req: Request) => {
	const user = req.user
	if (!user || user.role !== Role.ADMIN) {
		throw new UnauthorizedException('Bạn không có quyền truy cập', ErrorCode.UNAUTHORIED)
	}
	return user
}

export const listContracts = async (req: Request, res: Response) => {
	requireAdmin(req)
	
	const query = AdminContractListQuerySchema.parse(req.query)
	const result = await adminContractService.listContracts(query)
	
	res.status(StatusCodes.OK).json(result)
}

export const getContractDetail = async (req: Request, res: Response) => {
	requireAdmin(req)
	
	const { contractId } = AdminContractDetailParamsSchema.parse(req.params)
	const result = await adminContractService.getContractDetail(contractId)
	
	res.status(StatusCodes.OK).json(result)
}

export const getContractStats = async (req: Request, res: Response) => {
	requireAdmin(req)
	
	const result = await adminContractService.getContractStats()
	
	res.status(StatusCodes.OK).json(result)
}
