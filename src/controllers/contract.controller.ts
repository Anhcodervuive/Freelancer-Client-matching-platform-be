import type { Express } from 'express'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { BadRequestException } from '~/exceptions/bad-request'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
	ApproveMilestoneSubmissionSchema,
	CancelMilestoneSchema,
	ContractListFilterSchema,
	CreateContractMilestoneSchema,
	CreateDisputeNegotiationSchema,
	DeclineMilestoneSubmissionSchema,
	OpenMilestoneDisputeSchema,
	ConfirmArbitrationFeeSchema,
	PayMilestoneSchema,
	RespondDisputeNegotiationSchema,
	RespondMilestoneCancellationSchema,
	SubmitMilestoneSchema,
	UpdateDisputeNegotiationSchema,
	EndContractSchema,
	SubmitContractFeedbackSchema,
	UpdateContractFeedbackSchema,
	AcceptContractTermsSchema,
	TriggerDocuSignEnvelopeSchema
} from '~/schema/contract.schema'
import { SubmitFinalEvidenceSchema } from '~/schema/dispute.schema'
import contractService from '~/services/contract.service'
import contractSignatureService from '~/services/contract-signature.service'
import { throwArbitrationDisabled } from '~/helpers/arbitration'

const RESOURCE_FILE_FIELD_NAMES = new Set(['resourceFiles', 'resourceFiles[]', 'files', 'files[]'])
const SUBMISSION_FILE_FIELD_NAMES = new Set(['attachments', 'attachments[]', 'files', 'files[]'])

const extractResourceFiles = (files: Request['files']): Express.Multer.File[] => {
	if (!files) return []

	if (Array.isArray(files)) {
		return (files as Express.Multer.File[]).filter(file => RESOURCE_FILE_FIELD_NAMES.has(file.fieldname))
	}

	const map = files as Record<string, Express.Multer.File[] | undefined>

	return Array.from(RESOURCE_FILE_FIELD_NAMES).flatMap(fieldName => map[fieldName] ?? [])
}

const extractSubmissionFiles = (files: Request['files']): Express.Multer.File[] => {
	if (!files) return []

	if (Array.isArray(files)) {
		return (files as Express.Multer.File[]).filter(file => SUBMISSION_FILE_FIELD_NAMES.has(file.fieldname))
	}

	const map = files as Record<string, Express.Multer.File[] | undefined>

	return Array.from(SUBMISSION_FILE_FIELD_NAMES).flatMap(fieldName => map[fieldName] ?? [])
}

const extractRequestIp = (req: Request): string | null => {
	const forwarded = req.headers['x-forwarded-for']

	if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
		const [first] = forwarded
			.split(',')
			.map(value => value.trim())
			.filter(Boolean)
		if (first) {
			return first
		}
	} else if (Array.isArray(forwarded) && forwarded.length > 0) {
		const first = forwarded.map(value => value.trim()).find(value => value.length > 0)
		if (first) {
			return first
		}
	}

	if (req.ip) {
		return req.ip
	}

	return req.socket?.remoteAddress ?? null
}

export const listContracts = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem hợp đồng', ErrorCode.UNAUTHORIED)
	}

	const filters = ContractListFilterSchema.parse(req.query)
	const result = await contractService.listContracts({ id: userId, role: user?.role ?? null }, filters)

	return res.status(StatusCodes.OK).json(result)
}

export const getContractDetail = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem hợp đồng', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const contract = await contractService.getContractDetail({ id: userId, role: user?.role ?? null }, contractId)

	return res.status(StatusCodes.OK).json(contract)
}

export const acceptContractTerms = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để đồng ý điều khoản', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = AcceptContractTermsSchema.parse(req.body)
	const ipAddress = extractRequestIp(req)
	const headerUserAgent = req.get('user-agent') ?? null
	const userAgent = payload.userAgent ?? headerUserAgent

	const result = await contractService.acceptContractTerms(
		contractId,
		{ id: userId, role: user?.role ?? null },
		payload,
		{ ipAddress, userAgent }
	)

	return res.status(StatusCodes.OK).json(result)
}

export const sendContractSignatureEnvelope = async (req: Request, res: Response): Promise<Response> => {
        const user = req.user
        const userId = user?.id
        const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để gửi yêu cầu ký', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = TriggerDocuSignEnvelopeSchema.parse(req.body ?? {})

        await contractSignatureService.enqueueDocuSignEnvelope(contractId, { id: userId, role: user?.role ?? null }, payload)

	const contract = await contractService.getContractDetail({ id: userId, role: user?.role ?? null }, contractId)

        return res.status(StatusCodes.OK).json(contract)
}

export const syncContractSignatureEnvelope = async (req: Request, res: Response): Promise<Response> => {
        const user = req.user
        const userId = user?.id
        const { contractId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để đồng bộ trạng thái ký', ErrorCode.UNAUTHORIED)
        }

        if (!contractId) {
                throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
        }

        await contractSignatureService.syncDocuSignEnvelopeStatus(contractId, { id: userId, role: user?.role ?? null })

        const contract = await contractService.getContractDetail({ id: userId, role: user?.role ?? null }, contractId)

        return res.status(StatusCodes.OK).json(contract)
}

export const endContract = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để kết thúc hợp đồng', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = EndContractSchema.parse(req.body)
	const contract = await contractService.endContract(userId, contractId, payload)

	return res.status(StatusCodes.OK).json(contract)
}

export const submitContractFeedback = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để gửi đánh giá', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = SubmitContractFeedbackSchema.parse(req.body)
	const result = await contractService.submitContractFeedback(userId, contractId, payload)

	return res.status(StatusCodes.CREATED).json(result)
}

export const listContractFeedbacks = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem đánh giá', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await contractService.listContractFeedbacks({ id: userId, role: user?.role ?? null }, contractId)

	return res.status(StatusCodes.OK).json(result)
}

export const updateContractFeedback = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để sửa đánh giá', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = UpdateContractFeedbackSchema.parse(req.body)
	const result = await contractService.updateContractFeedback(userId, contractId, payload)

	return res.status(StatusCodes.OK).json(result)
}

export const deleteContractFeedback = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xóa đánh giá', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const result = await contractService.deleteContractFeedback(userId, contractId)

	return res.status(StatusCodes.OK).json(result)
}

export const listContractMilestones = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const milestones = await contractService.listContractMilestones({ id: userId, role: user?.role ?? null }, contractId)

	return res.status(StatusCodes.OK).json({
		contractId,
		milestones
	})
}

export const listMilestoneResources = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem tài nguyên milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const resources = await contractService.listMilestoneResources(
		{ id: userId, role: user?.role ?? null },
		contractId,
		milestoneId
	)

	return res.status(StatusCodes.OK).json({
		contractId,
		milestoneId,
		resources
	})
}

export const listContractDisputes = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem tranh chấp của hợp đồng', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const disputes = await contractService.listContractDisputes({ id: userId, role: user?.role ?? null }, contractId)

	return res.status(StatusCodes.OK).json(disputes)
}

export const getMilestoneDispute = async (req: Request, res: Response) => {
	const user = req.user
	const userId = user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xem tranh chấp milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const dispute = await contractService.getMilestoneDispute(
		{ id: userId, role: user?.role ?? null },
		contractId,
		milestoneId
	)

	return res.status(StatusCodes.OK).json(dispute)
}

export const createContractMilestone = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để tạo milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId) {
		throw new BadRequestException('Thiếu tham số contractId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = CreateContractMilestoneSchema.parse(req.body)
	const milestone = await contractService.createContractMilestone(userId, contractId, payload)

	return res.status(StatusCodes.CREATED).json(milestone)
}

export const uploadMilestoneResources = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để tải tài nguyên lên milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const files = extractResourceFiles(req.files)

	const resources = await contractService.uploadMilestoneResources(userId, contractId, milestoneId, files)

	return res.status(StatusCodes.CREATED).json({
		contractId,
		milestoneId,
		resources
	})
}

export const deleteMilestoneResource = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, resourceId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xóa tài nguyên milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !resourceId) {
		throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc resourceId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await contractService.deleteMilestoneResource(userId, contractId, milestoneId, resourceId)

	return res.status(StatusCodes.NO_CONTENT).send()
}

export const deleteContractMilestone = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xóa milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	await contractService.deleteContractMilestone(userId, contractId, milestoneId)

	return res.status(StatusCodes.NO_CONTENT).send()
}

export const cancelMilestone = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để yêu cầu hủy milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = CancelMilestoneSchema.parse(req.body)
	const result = await contractService.cancelMilestone(userId, contractId, milestoneId, payload)

	return res.status(StatusCodes.ACCEPTED).json(result)
}

export const respondMilestoneCancellation = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để phản hồi yêu cầu hủy milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = RespondMilestoneCancellationSchema.parse(req.body)
	const result = await contractService.respondMilestoneCancellation(userId, contractId, milestoneId, payload)

	return res.status(StatusCodes.OK).json(result)
}

export const openMilestoneDispute = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để mở tranh chấp milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = OpenMilestoneDisputeSchema.parse(req.body)
	const result = await contractService.openMilestoneDispute(userId, contractId, milestoneId, payload)

	return res.status(StatusCodes.CREATED).json(result)
}

export const createDisputeNegotiation = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để gửi đề xuất tranh chấp', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !disputeId) {
		throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc disputeId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = CreateDisputeNegotiationSchema.parse(req.body)
	const result = await contractService.createDisputeNegotiation(userId, contractId, milestoneId, disputeId, payload)

	return res.status(StatusCodes.CREATED).json(result)
}

export const updateDisputeNegotiation = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId, negotiationId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để cập nhật đề xuất tranh chấp', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !disputeId || !negotiationId) {
		throw new BadRequestException(
			'Thiếu tham số contractId, milestoneId, disputeId hoặc negotiationId',
			ErrorCode.PARAM_QUERY_ERROR
		)
	}

	const payload = UpdateDisputeNegotiationSchema.parse(req.body)
	const result = await contractService.updateDisputeNegotiation(
		userId,
		contractId,
		milestoneId,
		disputeId,
		negotiationId,
		payload
	)

	return res.status(StatusCodes.OK).json(result)
}

export const respondDisputeNegotiation = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId, negotiationId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để phản hồi đề xuất tranh chấp', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !disputeId || !negotiationId) {
		throw new BadRequestException(
			'Thiếu tham số contractId, milestoneId, disputeId hoặc negotiationId',
			ErrorCode.PARAM_QUERY_ERROR
		)
	}

	const payload = RespondDisputeNegotiationSchema.parse(req.body)
	const result = await contractService.respondDisputeNegotiation(
		userId,
		contractId,
		milestoneId,
		disputeId,
		negotiationId,
		payload
	)

	return res.status(StatusCodes.OK).json(result)
}

export const deleteDisputeNegotiation = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId, negotiationId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để xóa đề xuất tranh chấp', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !disputeId || !negotiationId) {
		throw new BadRequestException(
			'Thiếu tham số contractId, milestoneId, disputeId hoặc negotiationId',
			ErrorCode.PARAM_QUERY_ERROR
		)
	}

	const result = await contractService.deleteDisputeNegotiation(
		userId,
		contractId,
		milestoneId,
		disputeId,
		negotiationId
	)

	return res.status(StatusCodes.OK).json(result)
}

export const confirmArbitrationFee = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xác nhận đã đóng phí trọng tài', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId || !disputeId) {
                throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc disputeId', ErrorCode.PARAM_QUERY_ERROR)
        }

        throwArbitrationDisabled()

        const payload = ConfirmArbitrationFeeSchema.parse(req.body)

        const result = await contractService.confirmArbitrationFee(userId, contractId, milestoneId, disputeId, payload)

	return res.status(StatusCodes.OK).json(result)
}

export const listFinalEvidenceSources = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để xem danh sách chứng cứ', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId || !disputeId) {
                throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc disputeId', ErrorCode.PARAM_QUERY_ERROR)
        }

        throwArbitrationDisabled()

        const result = await contractService.listFinalEvidenceSources(userId, contractId, milestoneId, disputeId)

	return res.status(StatusCodes.OK).json(result)
}

export const submitFinalEvidence = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, disputeId } = req.params

        if (!userId) {
                throw new UnauthorizedException('Bạn cần đăng nhập để nộp bằng chứng tranh chấp', ErrorCode.UNAUTHORIED)
        }

        if (!contractId || !milestoneId || !disputeId) {
                throw new BadRequestException('Thiếu tham số contractId, milestoneId hoặc disputeId', ErrorCode.PARAM_QUERY_ERROR)
        }

        throwArbitrationDisabled()

        const payload = SubmitFinalEvidenceSchema.parse(req.body)
        const result = await contractService.submitFinalEvidence(userId, contractId, milestoneId, disputeId, payload)

	return res.status(StatusCodes.OK).json(result)
}

export const payMilestone = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để thanh toán milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = PayMilestoneSchema.parse(req.body)
	const result = await contractService.payMilestone(userId, contractId, milestoneId, payload)

	return res.status(StatusCodes.OK).json(result)
}

export const submitMilestoneWork = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để gửi kết quả milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId) {
		throw new BadRequestException('Thiếu tham số contractId hoặc milestoneId', ErrorCode.PARAM_QUERY_ERROR)
	}

	const payload = SubmitMilestoneSchema.parse(req.body)
	const files = extractSubmissionFiles(req.files)

	const submission = await contractService.submitMilestoneWork(userId, contractId, milestoneId, payload, files)

	return res.status(StatusCodes.CREATED).json(submission)
}

export const approveMilestoneSubmission = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, submissionId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để duyệt kết quả milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !submissionId) {
		throw new BadRequestException(
			'Thiếu tham số contractId, milestoneId hoặc submissionId',
			ErrorCode.PARAM_QUERY_ERROR
		)
	}

	const payload = ApproveMilestoneSubmissionSchema.parse(req.body)
	const submission = await contractService.approveMilestoneSubmission(
		userId,
		contractId,
		milestoneId,
		submissionId,
		payload
	)

	return res.status(StatusCodes.OK).json(submission)
}

export const declineMilestoneSubmission = async (req: Request, res: Response) => {
	const userId = req.user?.id
	const { contractId, milestoneId, submissionId } = req.params

	if (!userId) {
		throw new UnauthorizedException('Bạn cần đăng nhập để từ chối milestone', ErrorCode.UNAUTHORIED)
	}

	if (!contractId || !milestoneId || !submissionId) {
		throw new BadRequestException(
			'Thiếu tham số contractId, milestoneId hoặc submissionId',
			ErrorCode.PARAM_QUERY_ERROR
		)
	}

	const payload = DeclineMilestoneSubmissionSchema.parse(req.body)
	const submission = await contractService.declineMilestoneSubmission(
		userId,
		contractId,
		milestoneId,
		submissionId,
		payload
	)

	return res.status(StatusCodes.OK).json(submission)
}
