import { Request, Response } from 'express'
import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import {
	CreateMediationEvidenceSubmissionSchema,
	UpdateMediationEvidenceSubmissionSchema,
	SubmitMediationEvidenceSchema,
	ReviewMediationEvidenceSchema,
	AddMediationEvidenceCommentSchema,
	MediationEvidenceQuerySchema
} from '~/schema/mediation-evidence.schema'
import mediationEvidenceService from '~/services/mediation-evidence.service'

export const createMediationEvidenceSubmission = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { disputeId } = req.params
	if (!disputeId) {
		throw new BadRequestException('Missing disputeId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = CreateMediationEvidenceSubmissionSchema.parse(req.body)
	const result = await mediationEvidenceService.createMediationEvidenceSubmission(disputeId, user.id, user.role!, input)

	return res.status(201).json({ data: result })
}

export const updateMediationEvidenceSubmission = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = UpdateMediationEvidenceSubmissionSchema.parse(req.body)
	const result = await mediationEvidenceService.updateMediationEvidenceSubmission(
		submissionId,
		user.id,
		user.role!,
		input
	)

	return res.json({ data: result })
}

export const submitMediationEvidence = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationEvidenceService.submitMediationEvidence(submissionId, user.id, user.role!)

	return res.json({ data: result })
}

export const reviewMediationEvidence = async (req: Request, res: Response) => {
	const user = req.user
	if (!user || user.role !== 'ADMIN') {
		throw new BadRequestException('Admin access required', ErrorCode.FORBIDDEN)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = ReviewMediationEvidenceSchema.parse(req.body)
	const result = await mediationEvidenceService.reviewMediationEvidence(submissionId, user.id, input)

	return res.json({ data: result })
}
export const addMediationEvidenceComment = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const input = AddMediationEvidenceCommentSchema.parse(req.body)
	const result = await mediationEvidenceService.addMediationEvidenceComment(submissionId, user.id, user.role!, input)

	return res.status(201).json({ data: result })
}

export const getMediationEvidenceSubmission = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationEvidenceService.getMediationEvidenceSubmission(submissionId, user.id, user.role!)

	return res.json({ data: result })
}

export const listMediationEvidenceSubmissions = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { disputeId } = req.params
	if (!disputeId) {
		throw new BadRequestException('Missing disputeId', ErrorCode.PARAM_QUERY_ERROR)
	}

	// Merge params and query
	const queryData = {
		...req.query,
		disputeId
	}

	const query = MediationEvidenceQuerySchema.parse(queryData)
	const result = await mediationEvidenceService.listMediationEvidenceSubmissions(query, user.id, user.role!)

	return res.json(result)
}

export const deleteMediationEvidenceSubmission = async (req: Request, res: Response) => {
	const user = req.user
	if (!user) {
		throw new BadRequestException('User not authenticated', ErrorCode.UNAUTHORIED)
	}

	const { submissionId } = req.params
	if (!submissionId) {
		throw new BadRequestException('Missing submissionId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await mediationEvidenceService.deleteMediationEvidenceSubmission(submissionId, user.id, user.role!)

	return res.json(result)
}
