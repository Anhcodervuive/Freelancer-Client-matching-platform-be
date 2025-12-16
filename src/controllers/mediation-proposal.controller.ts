import { Request, Response } from 'express'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { Role } from '~/generated/prisma'

// Define enum temporarily until Prisma generates it
enum MediationProposalStatus {
	PENDING = 'PENDING',
	ACCEPTED_BY_ALL = 'ACCEPTED_BY_ALL',
	REJECTED = 'REJECTED',
	EXPIRED = 'EXPIRED'
}
import {
	CreateMediationProposalSchema,
	RespondToMediationProposalSchema
} from '~/schema/mediation-evidence.schema'
import mediationProposalService from '~/services/mediation-proposal.service'

const ensureAdminUser = (req: Request) => {
	const user = req.user
	if (!user || user.role !== Role.ADMIN) {
		throw new BadRequestException('Admin access required', ErrorCode.FORBIDDEN)
	}
	return user
}

export const createMediationProposal = async (req: Request, res: Response) => {
	const admin = ensureAdminUser(req)
	
	const { disputeId } = req.params
	if (!disputeId) {
		throw new BadRequestException('Missing disputeId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = CreateMediationProposalSchema.parse(req.body)
	const result = await mediationProposalService.createMediationProposal(
		disputeId,
		admin.id,
		input
	)

	return res.status(201).json({ data: result })
}

export const respondToMediationProposal = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { proposalId } = req.params
	if (!proposalId) {
		throw new BadRequestException('Missing proposalId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = RespondToMediationProposalSchema.parse(req.body)
	const result = await mediationProposalService.respondToMediationProposal(
		proposalId,
		user.id,
		user.role!,
		input
	)

	return res.json({ data: result })
}

export const getMediationProposal = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { proposalId } = req.params
	if (!proposalId) {
		throw new BadRequestException('Missing proposalId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationProposalService.getMediationProposal(
		proposalId,
		user.id,
		user.role!
	)

	return res.json({ data: result })
}

export const listMediationProposals = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { disputeId } = req.params
	if (!disputeId) {
		throw new BadRequestException('Missing disputeId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationProposalService.listMediationProposals(
		disputeId,
		user.id,
		user.role!
	)

	return res.json({ data: result })
}

export const deleteMediationProposal = async (req: Request, res: Response) => {
	const admin = ensureAdminUser(req)

	const { proposalId } = req.params
	if (!proposalId) {
		throw new BadRequestException('Missing proposalId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationProposalService.deleteMediationProposal(
		proposalId,
		admin.id
	)

	return res.json(result)
}