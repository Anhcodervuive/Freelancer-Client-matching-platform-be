import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Express } from 'express'
import Stripe from 'stripe'

import {
	AssetKind,
	AssetProvider,
	AssetStatus,
	EscrowStatus,
	MilestoneStatus,
	MilestoneSubmissionStatus,
	PaymentStatus,
	Prisma,
	TransferStatus
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { R2_CONFIG, STRIPE_CONFIG_INFO } from '~/config/environment'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
	ApproveMilestoneSubmissionInput,
	ContractListFilterInput,
	CreateContractMilestoneInput,
	DeclineMilestoneSubmissionInput,
	PayMilestoneInput,
	SubmitMilestoneInput
} from '~/schema/contract.schema'
import { deleteR2Object, uploadBufferToR2 } from '~/providers/r2.provider'
import { InternalServerException } from '~/exceptions/internal-server'

const contractJobSummarySelect = Prisma.validator<Prisma.JobPostSelect>()({
	id: true,
	title: true,
	status: true,
	paymentMode: true,
	budgetAmount: true,
	budgetCurrency: true
})

const contractClientSelect = Prisma.validator<Prisma.ClientSelect>()({
	userId: true,
	companyName: true,
	profile: {
		select: {
			firstName: true,
			lastName: true,
			country: true,
			city: true
		}
	}
})

const contractFreelancerSelect = Prisma.validator<Prisma.FreelancerSelect>()({
	userId: true,
	title: true,
	profile: {
		select: {
			firstName: true,
			lastName: true,
			country: true,
			city: true
		}
	}
})

const contractSummaryInclude = Prisma.validator<Prisma.ContractInclude>()({
	jobPost: {
		select: contractJobSummarySelect
	},
	client: {
		select: contractClientSelect
	},
	freelancer: {
		select: contractFreelancerSelect
	}
})

const contractJobDetailInclude = Prisma.validator<Prisma.JobPostInclude>()({
	specialty: {
		include: {
			category: true
		}
	},
	languages: true,
	requiredSkills: {
		include: { skill: true }
	},
	screeningQuestions: true,
	attachments: {
		include: {
			assetLink: {
				include: {
					asset: true
				}
			}
		}
	}
})

const milestoneResourceInclude = Prisma.validator<Prisma.MilestoneResourceInclude>()({
	asset: {
		select: {
			id: true,
			kind: true,
			url: true,
			mimeType: true,
			bytes: true,
			status: true
		}
	}
})

const milestoneSubmissionAttachmentInclude = Prisma.validator<Prisma.MilestoneSubmissionAttachmentInclude>()({
	asset: {
		select: {
			id: true,
			kind: true,
			url: true,
			mimeType: true,
			bytes: true,
			status: true
		}
	}
})

const milestoneSubmissionInclude = Prisma.validator<Prisma.MilestoneSubmissionInclude>()({
	attachments: {
		include: milestoneSubmissionAttachmentInclude,
		orderBy: { createdAt: 'asc' }
	},
	reviewer: {
		select: {
			userId: true,
			profile: {
				select: {
					firstName: true,
					lastName: true
				}
			}
		}
	}
})

const milestoneInclude = Prisma.validator<Prisma.MilestoneInclude>()({
	escrow: {
		select: {
			id: true,
			status: true,
			currency: true,
			amountFunded: true,
			amountReleased: true,
			amountRefunded: true,
			createdAt: true,
			updatedAt: true
		}
	},
	resources: {
		include: milestoneResourceInclude
	},
	submissions: {
		include: milestoneSubmissionInclude,
		orderBy: { createdAt: 'desc' }
	},
	approvedSubmission: {
		include: milestoneSubmissionInclude
	}
})

const contractDetailInclude = Prisma.validator<Prisma.ContractInclude>()({
	jobPost: {
		include: contractJobDetailInclude
	},
	client: {
		select: contractClientSelect
	},
	freelancer: {
		select: contractFreelancerSelect
	},
	proposal: {
		select: {
			id: true,
			status: true,
			submittedAt: true
		}
	},
	offer: {
		select: {
			id: true,
			status: true,
			sentAt: true
		}
	},
	milestones: {
		where: { isDeleted: false },
		include: milestoneInclude,
		orderBy: { updatedAt: 'desc' }
	}
})

type ContractSummaryPayload = Prisma.ContractGetPayload<{ include: typeof contractSummaryInclude }>
type ContractDetailPayload = Prisma.ContractGetPayload<{ include: typeof contractDetailInclude }>
type MilestonePayload = Prisma.MilestoneGetPayload<{ include: typeof milestoneInclude }>
type MilestoneResourcePayload = Prisma.MilestoneResourceGetPayload<{ include: typeof milestoneResourceInclude }>
type MilestoneSubmissionAttachmentPayload = Prisma.MilestoneSubmissionAttachmentGetPayload<{
	include: typeof milestoneSubmissionAttachmentInclude
}>
type MilestoneSubmissionPayload = Prisma.MilestoneSubmissionGetPayload<{ include: typeof milestoneSubmissionInclude }>
type PaymentEntity = Prisma.PaymentGetPayload<{}>
type TransferEntity = Prisma.TransferGetPayload<{}>
type ContractJobSkillRelation = NonNullable<ContractDetailPayload['jobPost']>['requiredSkills'][number]

const ensureClientUser = async (userId: string) => {
	const client = await prismaClient.client.findUnique({
		where: { userId },
		select: { userId: true }
	})

	if (!client) {
		throw new UnauthorizedException('Chỉ client mới có thể quản lý milestone', ErrorCode.USER_NOT_AUTHORITY)
	}

	return client
}

const ensureFreelancerUser = async (userId: string) => {
	const freelancer = await prismaClient.freelancer.findUnique({
		where: { userId },
		select: { userId: true }
	})

	if (!freelancer) {
		throw new UnauthorizedException('Chỉ freelancer mới có thể gửi kết quả milestone', ErrorCode.USER_NOT_AUTHORITY)
	}

	return freelancer
}

const ensureContractBelongsToClient = async (contractId: string, clientId: string) => {
	const contract = await prismaClient.contract.findUnique({
		where: { id: contractId },
		select: {
			id: true,
			clientId: true,
			currency: true
		}
	})

	if (!contract || contract.clientId !== clientId) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	return contract
}

const ensureContractBelongsToFreelancer = async (contractId: string, freelancerId: string) => {
	const contract = await prismaClient.contract.findUnique({
		where: { id: contractId },
		select: {
			id: true,
			freelancerId: true,
			currency: true
		}
	})

	if (!contract || contract.freelancerId !== freelancerId) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	return contract
}

const ensureMilestoneBelongsToContract = async (milestoneId: string, contractId: string) => {
	const milestone = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		select: {
			id: true,
			contractId: true
		}
	})

	if (!milestone) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	return milestone
}

let stripeClient: Stripe | null = null

const getStripeClient = () => {
	const apiKey = STRIPE_CONFIG_INFO.API_KEY?.trim()

	if (!apiKey) {
		throw new InternalServerException('Stripe chưa được cấu hình', ErrorCode.INTERNAL_SERVER_ERROR)
	}

	if (!stripeClient) {
		stripeClient = new Stripe(apiKey)
	}

	return stripeClient
}

const ZERO_DECIMAL_CURRENCIES = new Set([
	'bif',
	'clp',
	'djf',
	'gnf',
	'jpy',
	'kmf',
	'krw',
	'mga',
	'pyg',
	'rwf',
	'ugx',
	'vnd',
	'vuv',
	'xaf',
	'xof',
	'xpf'
])

const toMinorUnitAmount = (value: Prisma.Decimal | number | string, currency: string) => {
	const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value)
	const lowerCurrency = currency.toLowerCase()

	if (ZERO_DECIMAL_CURRENCIES.has(lowerCurrency)) {
		return Number(decimal.toFixed(0))
	}

	return Number(decimal.mul(100).toFixed(0))
}

const loadMilestoneWithDetails = async (milestoneId: string) => {
	const milestone = await prismaClient.milestone.findUnique({
		where: { id: milestoneId },
		include: milestoneInclude
	})

	if (!milestone) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	return milestone
}

type ProfileSummary = ContractSummaryPayload['client']['profile'] | null

type SerializedProfile = {
	firstName: string | null
	lastName: string | null
	displayName: string | null
	location: {
		country: string | null
		city: string | null
	}
}

const buildDisplayName = (profile: ProfileSummary): string | null => {
	if (!profile) return null
	const firstName = profile.firstName ?? ''
	const lastNameInitial = profile.lastName ? `${profile.lastName[0]}.` : ''
	const combined = `${firstName} ${lastNameInitial}`.trim()
	return combined.length > 0 ? combined : null
}

const serializeProfile = (profile: ProfileSummary): SerializedProfile => {
	return {
		firstName: profile?.firstName ?? null,
		lastName: profile?.lastName ?? null,
		displayName: buildDisplayName(profile),
		location: {
			country: profile?.country ?? null,
			city: profile?.city ?? null
		}
	}
}

const serializeClient = (contract: ContractSummaryPayload['client']) => {
	if (!contract) return null

	return {
		id: contract.userId,
		companyName: contract.companyName ?? null,
		profile: serializeProfile(contract.profile)
	}
}

const serializeFreelancer = (freelancer: ContractSummaryPayload['freelancer']) => {
	return {
		id: freelancer.userId,
		title: freelancer.title ?? null,
		profile: serializeProfile(freelancer.profile)
	}
}

const serializeJobPostSummary = (jobPost: ContractSummaryPayload['jobPost']) => {
	if (!jobPost) return null

	return {
		id: jobPost.id,
		title: jobPost.title,
		status: jobPost.status,
		paymentMode: jobPost.paymentMode,
		budgetAmount: jobPost.budgetAmount ? Number(jobPost.budgetAmount) : null,
		budgetCurrency: jobPost.budgetCurrency ?? null
	}
}

const sortScreeningQuestions = <T extends { orderIndex: number; createdAt: Date }>(questions: readonly T[]) => {
	return [...questions].sort((a, b) => {
		if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
		return a.createdAt.getTime() - b.createdAt.getTime()
	})
}

const mapJobSkills = (relations: readonly ContractJobSkillRelation[]) => {
	const required: { id: string; name: string; slug: string; orderHint: number | null }[] = []
	const preferred: { id: string; name: string; slug: string; orderHint: number | null }[] = []

	const sorted = [...relations].sort((a, b) => {
		if (a.isPreferred !== b.isPreferred) {
			return a.isPreferred ? 1 : -1
		}

		const hintA = a.orderHint ?? Number.MAX_SAFE_INTEGER
		const hintB = b.orderHint ?? Number.MAX_SAFE_INTEGER

		if (hintA !== hintB) {
			return hintA - hintB
		}

		return 0
	})

	for (const relation of sorted) {
		const view = {
			id: relation.skill.id,
			name: relation.skill.name,
			slug: relation.skill.slug,
			orderHint: relation.orderHint ?? null
		}

		if (relation.isPreferred) {
			preferred.push(view)
		} else {
			required.push(view)
		}
	}

	return { required, preferred }
}

const serializeJobPostDetail = (jobPost: ContractDetailPayload['jobPost']) => {
	if (!jobPost) return null

	const skills = mapJobSkills(jobPost.requiredSkills)
	const attachments = jobPost.attachments
		.map(attachment => ({
			id: attachment.id,
			assetLinkId: attachment.assetLinkId,
			addedBy: attachment.addedBy ?? null,
			createdAt: attachment.createdAt,
			updatedAt: attachment.updatedAt,
			position: attachment.assetLink.position,
			isPrimary: attachment.assetLink.isPrimary,
			label: attachment.assetLink.label ?? null,
			caption: attachment.assetLink.caption ?? null,
			asset: {
				id: attachment.assetLink.assetId,
				kind: attachment.assetLink.asset.kind,
				url: attachment.assetLink.asset.url ?? null,
				publicId: attachment.assetLink.asset.publicId ?? null,
				mimeType: attachment.assetLink.asset.mimeType ?? null,
				bytes: attachment.assetLink.asset.bytes ?? null,
				width: attachment.assetLink.asset.width ?? null,
				height: attachment.assetLink.asset.height ?? null
			}
		}))
		.sort((a, b) => a.position - b.position)

	const specialty = jobPost.specialty
		? {
				id: jobPost.specialty.id,
				name: jobPost.specialty.name,
				category: jobPost.specialty.category
					? {
							id: jobPost.specialty.category.id,
							name: jobPost.specialty.category.name
					  }
					: null
		  }
		: null

	return {
		id: jobPost.id,
		title: jobPost.title,
		status: jobPost.status,
		paymentMode: jobPost.paymentMode,
		budgetAmount: jobPost.budgetAmount ? Number(jobPost.budgetAmount) : null,
		budgetCurrency: jobPost.budgetCurrency ?? null,
		description: jobPost.description,
		duration: jobPost.duration ?? null,
		experienceLevel: jobPost.experienceLevel,
		locationType: jobPost.locationType,
		preferredLocations: Array.isArray(jobPost.preferredLocations) ? jobPost.preferredLocations : [],
		customTerms: (jobPost.customTerms ?? null) as Record<string, unknown> | null,
		visibility: jobPost.visibility,
		publishedAt: jobPost.publishedAt ?? null,
		closedAt: jobPost.closedAt ?? null,
		createdAt: jobPost.createdAt,
		updatedAt: jobPost.updatedAt,
		specialty,
		languages: jobPost.languages.map(language => ({
			languageCode: language.languageCode,
			proficiency: language.proficiency
		})),
		skills,
		screeningQuestions: sortScreeningQuestions(jobPost.screeningQuestions).map(question => ({
			id: question.id,
			question: question.question,
			isRequired: question.isRequired,
			orderIndex: question.orderIndex
		})),
		attachments
	}
}

const serializeContractSummary = (contract: ContractSummaryPayload) => {
	return {
		id: contract.id,
		title: contract.title,
		currency: contract.currency,
		status: contract.status,
		clientId: contract.clientId,
		freelancerId: contract.freelancerId,
		jobPostId: contract.jobPostId,
		proposalId: contract.proposalId,
		offerId: contract.offerId,
		jobPost: serializeJobPostSummary(contract.jobPost),
		client: serializeClient(contract.client),
		freelancer: serializeFreelancer(contract.freelancer),
		createdAt: contract.createdAt,
		updatedAt: contract.updatedAt
	}
}

const serializeContractDetail = (contract: ContractDetailPayload) => {
	const base = serializeContractSummary(contract)

	return {
		...base,
		jobPost: serializeJobPostDetail(contract.jobPost),
		proposal: contract.proposal
			? {
					id: contract.proposal.id,
					status: contract.proposal.status,
					submittedAt: contract.proposal.submittedAt
			  }
			: null,
		offer: contract.offer
			? {
					id: contract.offer.id,
					status: contract.offer.status,
					sentAt: contract.offer.sentAt
			  }
			: null,
		milestones: contract.milestones.map(milestone => serializeMilestone(milestone))
	}
}

const extractOriginalName = (metadata: Prisma.JsonValue | null | undefined): string | null => {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return null
	}
	const record = metadata as Record<string, unknown>
	const value = record.originalName
	return typeof value === 'string' ? value : null
}

const determineAssetKind = (mime: string): AssetKind =>
	mime.startsWith('image/') ? 'IMAGE' : mime.startsWith('video/') ? 'VIDEO' : 'FILE'

const slugifyFileName = (name: string) => {
	const normalized = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
	return normalized.length > 0 ? normalized : 'file'
}

const milestoneResourceFolder = (contractId: string, milestoneId: string) => {
	const base = R2_CONFIG.MILESTONE_RESOURCE_PREFIX || 'contract-milestones'
	return [base, contractId, milestoneId].filter(Boolean).join('/')
}

const buildMilestoneResourceKey = (contractId: string, milestoneId: string, originalName: string) => {
	const folder = milestoneResourceFolder(contractId, milestoneId)
	const ext = path.extname(originalName)
	const base = path.basename(originalName, ext)
	const safeBase = slugifyFileName(base)
	const extension = ext ? ext.toLowerCase() : ''
	return [folder, `${safeBase}-${randomUUID()}${extension}`].filter(Boolean).join('/')
}

type UploadedMilestoneResource = {
	file: Express.Multer.File
	object: Awaited<ReturnType<typeof uploadBufferToR2>>
}

const cleanupMilestoneResourceUploads = async (uploads: readonly UploadedMilestoneResource[]) => {
	if (uploads.length === 0) return

	const tasks = uploads.map(item => deleteR2Object(item.object.bucket, item.object.key).catch(() => undefined))

	await Promise.allSettled(tasks)
}

const uploadMilestoneResourceFiles = async (
	contractId: string,
	milestoneId: string,
	files: readonly Express.Multer.File[]
): Promise<UploadedMilestoneResource[]> => {
	if (!files || files.length === 0) return []

	const uploads: UploadedMilestoneResource[] = []

	try {
		for (const file of files) {
			const key = buildMilestoneResourceKey(contractId, milestoneId, file.originalname || 'file')
			const object = await uploadBufferToR2(file.buffer, {
				key,
				contentType: file.mimetype
			})
			uploads.push({ file, object })
		}

		return uploads
	} catch (error) {
		await cleanupMilestoneResourceUploads(uploads)
		throw error
	}
}

const serializeMilestoneResource = (resource: MilestoneResourcePayload) => {
	const originalName = extractOriginalName(resource.metadata)
	return {
		id: resource.id,
		milestoneId: resource.milestoneId,
		assetId: resource.assetId ?? null,
		name: resource.name ?? originalName ?? null,
		url: resource.url ?? resource.asset?.url ?? null,
		mimeType: resource.mimeType ?? resource.asset?.mimeType ?? null,
		size: resource.size ?? resource.asset?.bytes ?? null,
		createdAt: resource.createdAt,
		updatedAt: resource.updatedAt,
		asset: resource.asset
			? {
					id: resource.asset.id,
					kind: resource.asset.kind,
					url: resource.asset.url,
					mimeType: resource.asset.mimeType,
					bytes: resource.asset.bytes,
					status: resource.asset.status
			  }
			: null
	}
}

const milestoneSubmissionFolder = (contractId: string, milestoneId: string) => {
	const base = R2_CONFIG.MILESTONE_SUBMISSION_PREFIX || 'contract-milestone-submissions'
	return [base, contractId, milestoneId].filter(Boolean).join('/')
}

const buildMilestoneSubmissionKey = (contractId: string, milestoneId: string, originalName: string) => {
	const folder = milestoneSubmissionFolder(contractId, milestoneId)
	const ext = path.extname(originalName)
	const base = path.basename(originalName, ext)
	const safeBase = slugifyFileName(base)
	const extension = ext ? ext.toLowerCase() : ''
	return [folder, `${safeBase}-${randomUUID()}${extension}`].filter(Boolean).join('/')
}

type UploadedMilestoneSubmissionAttachment = {
	file: Express.Multer.File
	object: Awaited<ReturnType<typeof uploadBufferToR2>>
}

const cleanupMilestoneSubmissionUploads = async (uploads: readonly UploadedMilestoneSubmissionAttachment[]) => {
	if (uploads.length === 0) return

	const tasks = uploads.map(item => deleteR2Object(item.object.bucket, item.object.key).catch(() => undefined))

	await Promise.allSettled(tasks)
}

const uploadMilestoneSubmissionFiles = async (
	contractId: string,
	milestoneId: string,
	files: readonly Express.Multer.File[]
): Promise<UploadedMilestoneSubmissionAttachment[]> => {
	if (!files || files.length === 0) return []

	const uploads: UploadedMilestoneSubmissionAttachment[] = []

	try {
		for (const file of files) {
			const key = buildMilestoneSubmissionKey(contractId, milestoneId, file.originalname || 'file')
			const object = await uploadBufferToR2(file.buffer, {
				key,
				contentType: file.mimetype
			})
			uploads.push({ file, object })
		}

		return uploads
	} catch (error) {
		await cleanupMilestoneSubmissionUploads(uploads)
		throw error
	}
}

const serializeMilestoneSubmissionAttachment = (attachment: MilestoneSubmissionAttachmentPayload) => {
	const originalName = extractOriginalName(attachment.metadata)

	return {
		id: attachment.id,
		submissionId: attachment.submissionId,
		assetId: attachment.assetId ?? null,
		name: attachment.name ?? originalName ?? null,
		url: attachment.url ?? attachment.asset?.url ?? null,
		mimeType: attachment.mimeType ?? attachment.asset?.mimeType ?? null,
		size: attachment.size ?? attachment.asset?.bytes ?? null,
		createdAt: attachment.createdAt,
		asset: attachment.asset
			? {
					id: attachment.asset.id,
					kind: attachment.asset.kind,
					url: attachment.asset.url,
					mimeType: attachment.asset.mimeType,
					bytes: attachment.asset.bytes,
					status: attachment.asset.status
			  }
			: null
	}
}

const serializeReviewerProfile = (
	reviewer: MilestoneSubmissionPayload['reviewer']
): {
	id: string
	firstName: string | null
	lastName: string | null
} | null => {
	if (!reviewer) return null

	return {
		id: reviewer.userId,
		firstName: reviewer.profile?.firstName ?? null,
		lastName: reviewer.profile?.lastName ?? null
	}
}

const serializeMilestoneSubmission = (submission: MilestoneSubmissionPayload) => {
	return {
		id: submission.id,
		milestoneId: submission.milestoneId,
		freelancerId: submission.freelancerId,
		message: submission.message ?? null,
		status: submission.status,
		reviewNote: submission.reviewNote ?? null,
		reviewRating: submission.reviewRating ?? null,
		reviewedAt: submission.reviewedAt ?? null,
		reviewedById: submission.reviewedById ?? null,
		createdAt: submission.createdAt,
		updatedAt: submission.updatedAt,
		attachments: submission.attachments.map(serializeMilestoneSubmissionAttachment),
		reviewer: serializeReviewerProfile(submission.reviewer)
	}
}

const serializeMilestone = (milestone: MilestonePayload) => {
	return {
		id: milestone.id,
		contractId: milestone.contractId,
		title: milestone.title,
		amount: Number(milestone.amount),
		currency: milestone.currency,
		startAt: milestone.startAt ?? null,
		endAt: milestone.endAt ?? null,
		status: milestone.status,
		submittedAt: milestone.submittedAt ?? null,
		approvedSubmissionId: milestone.approvedSubmissionId ?? null,
		approvedAt: milestone.approvedAt ?? null,
		releasedAt: milestone.releasedAt ?? null,
		updatedAt: milestone.updatedAt,
		resources: milestone.resources.map(resource => serializeMilestoneResource(resource)),
		submissions: milestone.submissions.map(submission => serializeMilestoneSubmission(submission)),
		approvedSubmission: milestone.approvedSubmission
			? serializeMilestoneSubmission(milestone.approvedSubmission)
			: null,
		escrow: milestone.escrow
			? {
					id: milestone.escrow.id,
					status: milestone.escrow.status,
					currency: milestone.escrow.currency,
					amountFunded: Number(milestone.escrow.amountFunded),
					amountReleased: Number(milestone.escrow.amountReleased),
					amountRefunded: Number(milestone.escrow.amountRefunded),
					createdAt: milestone.escrow.createdAt,
					updatedAt: milestone.escrow.updatedAt
			  }
			: null
	}
}

const serializePayment = (payment: PaymentEntity) => {
	return {
		id: payment.id,
		escrowId: payment.escrowId ?? null,
		type: payment.type,
		amount: Number(payment.amount),
		currency: payment.currency,
		status: payment.status,
		paymentIntentId: payment.paymentIntentId,
		chargeId: payment.chargeId ?? null,
		cardBrand: payment.cardBrand ?? null,
		cardLast4: payment.cardLast4 ?? null,
		cardExpMonth: payment.cardExpMonth ?? null,
		cardExpYear: payment.cardExpYear ?? null,
		cardFingerprint: payment.cardFingerprint ?? null,
		idemKey: payment.idemKey ?? null,
		createdAt: payment.createdAt,
		updatedAt: payment.updatedAt
	}
}

const serializeTransfer = (transfer: TransferEntity) => {
	return {
		id: transfer.id,
		escrowId: transfer.escrowId,
		amount: Number(transfer.amount),
		currency: transfer.currency,
		status: transfer.status,
		transferId: transfer.transferId ?? null,
		destinationAccountId: transfer.destinationAccountId,
		idemKey: transfer.idemKey ?? null,
		createdAt: transfer.createdAt,
		updatedAt: transfer.updatedAt
	}
}

const ensureContractAccess = async (contractId: string, userId: string) => {
	const contract = await prismaClient.contract.findFirst({
		where: {
			id: contractId,
			OR: [{ clientId: userId }, { freelancerId: userId }]
		},
		select: { id: true }
	})

	if (!contract) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}
}

const buildContractWhere = (userId: string, filters: ContractListFilterInput): Prisma.ContractWhereInput => {
	const andConditions: Prisma.ContractWhereInput[] = []

	if (filters.role === 'client') {
		andConditions.push({ clientId: userId })
	} else if (filters.role === 'freelancer') {
		andConditions.push({ freelancerId: userId })
	} else {
		andConditions.push({ OR: [{ clientId: userId }, { freelancerId: userId }] })
	}

	if (filters.search) {
		const search = filters.search
		andConditions.push({
			OR: [{ title: { contains: search } }, { jobPost: { title: { contains: search } } }]
		})
	}

	if (filters.status) {
		andConditions.push({ status: filters.status })
	}

	if (andConditions.length === 1) {
		return andConditions[0]!
	}

	return { AND: andConditions }
}

const listContracts = async (userId: string, filters: ContractListFilterInput) => {
	const page = filters.page
	const limit = filters.limit
	const skip = (page - 1) * limit
	const where = buildContractWhere(userId, filters)

	const [contracts, total] = await prismaClient.$transaction([
		prismaClient.contract.findMany({
			where,
			include: contractSummaryInclude,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit
		}),
		prismaClient.contract.count({ where })
	])

	const data = contracts.map(contract => serializeContractSummary(contract))
	const totalPages = Math.ceil(total / limit)

	return {
		data,
		pagination: {
			page,
			limit,
			total,
			totalPages
		}
	}
}

const getContractDetail = async (userId: string, contractId: string) => {
	const contract = await prismaClient.contract.findFirst({
		where: {
			id: contractId,
			OR: [{ clientId: userId }, { freelancerId: userId }]
		},
		include: contractDetailInclude
	})

	if (!contract) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	return serializeContractDetail(contract)
}

const listContractMilestones = async (userId: string, contractId: string) => {
	await ensureContractAccess(contractId, userId)

	const milestones = await prismaClient.milestone.findMany({
		where: { contractId, isDeleted: false },
		include: milestoneInclude,
		orderBy: { updatedAt: 'desc' }
	})

	return milestones.map(serializeMilestone)
}

const listMilestoneResources = async (userId: string, contractId: string, milestoneId: string) => {
	await ensureContractAccess(contractId, userId)

	const milestone = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		include: {
			resources: {
				include: milestoneResourceInclude,
				orderBy: { createdAt: 'desc' }
			}
		}
	})

	if (!milestone) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	return milestone.resources.map(resource => serializeMilestoneResource(resource))
}

const createContractMilestone = async (
	clientUserId: string,
	contractId: string,
	payload: CreateContractMilestoneInput
) => {
	await ensureClientUser(clientUserId)
	const contract = await ensureContractBelongsToClient(contractId, clientUserId)

	const currency = payload.currency.toUpperCase()

	if (contract.currency.toUpperCase() !== currency) {
		throw new BadRequestException('Currency của milestone phải trùng với hợp đồng', ErrorCode.PARAM_QUERY_ERROR)
	}

	const milestone = await prismaClient.milestone.create({
		data: {
			contract: {
				connect: { id: contractId }
			},
			title: payload.title,
			amount: new Prisma.Decimal(payload.amount),
			currency,
			startAt: payload.startAt ?? null,
			endAt: payload.endAt ?? null,
			escrow: {
				create: {
					currency
				}
			}
		},
		include: milestoneInclude
	})

	return serializeMilestone(milestone)
}

const uploadMilestoneResources = async (
	clientUserId: string,
	contractId: string,
	milestoneId: string,
	files: readonly Express.Multer.File[] | undefined
) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)
	await ensureMilestoneBelongsToContract(milestoneId, contractId)

	if (!files || files.length === 0) {
		throw new BadRequestException('Bạn cần tải lên ít nhất một file tài nguyên', ErrorCode.PARAM_QUERY_ERROR)
	}

	const uploads = await uploadMilestoneResourceFiles(contractId, milestoneId, files)

	try {
		const resources = await prismaClient.$transaction(async tx => {
			const created: MilestoneResourcePayload[] = []

			for (const item of uploads) {
				const meta: Prisma.JsonObject = { originalName: item.file.originalname }
				const asset = await tx.asset.create({
					data: {
						provider: AssetProvider.R2,
						kind: determineAssetKind(item.file.mimetype),
						bucket: item.object.bucket,
						storageKey: item.object.key,
						url: item.object.url,
						mimeType: item.file.mimetype,
						bytes: item.file.size ?? null,
						createdBy: clientUserId,
						status: AssetStatus.READY,
						meta
					}
				})

				const resource = await tx.milestoneResource.create({
					data: {
						milestoneId,
						assetId: asset.id,
						url: item.object.url,
						name: item.file.originalname,
						mimeType: item.file.mimetype,
						size: item.file.size ?? null,
						metadata: meta
					},
					include: milestoneResourceInclude
				})

				created.push(resource)
			}

			return created
		})

		return resources.map(resource => serializeMilestoneResource(resource))
	} catch (error) {
		await cleanupMilestoneResourceUploads(uploads)
		throw error
	}
}

const deleteMilestoneResource = async (
	clientUserId: string,
	contractId: string,
	milestoneId: string,
	resourceId: string
) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)
	await ensureMilestoneBelongsToContract(milestoneId, contractId)

	const resource = await prismaClient.milestoneResource.findFirst({
		where: {
			id: resourceId,
			milestoneId,
			milestone: {
				contractId
			}
		},
		include: {
			asset: true
		}
	})

	if (!resource) {
		throw new NotFoundException('Không tìm thấy tài nguyên', ErrorCode.ITEM_NOT_FOUND)
	}

	const asset = resource.asset

	await prismaClient.$transaction(async tx => {
		await tx.milestoneResource.delete({ where: { id: resource.id } })

		if (asset) {
			await tx.asset.delete({ where: { id: asset.id } })
		}
	})

	if (asset?.provider === AssetProvider.R2 && asset.bucket && asset.storageKey) {
		await deleteR2Object(asset.bucket, asset.storageKey)
	}
}

const deleteContractMilestone = async (clientUserId: string, contractId: string, milestoneId: string) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)

	const milestone = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		include: {
			resources: {
				include: {
					asset: {
						select: {
							id: true,
							provider: true,
							bucket: true,
							storageKey: true
						}
					}
				}
			}
		}
	})

	if (!milestone) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	const resourceIds = milestone.resources.map(resource => resource.id)
	const assetIds = milestone.resources
		.map(resource => resource.asset?.id ?? null)
		.filter((id): id is string => Boolean(id))
	const r2Objects = milestone.resources
		.map(resource => {
			const asset = resource.asset
			if (asset?.provider === AssetProvider.R2 && asset.bucket && asset.storageKey) {
				return { bucket: asset.bucket, key: asset.storageKey }
			}
			return null
		})
		.filter((object): object is { bucket: string; key: string } => Boolean(object?.bucket && object?.key))

	await prismaClient.$transaction(async tx => {
		if (resourceIds.length > 0) {
			await tx.milestoneResource.deleteMany({
				where: {
					id: { in: resourceIds }
				}
			})
		}

		if (assetIds.length > 0) {
			await tx.asset.deleteMany({
				where: {
					id: { in: assetIds }
				}
			})
		}

		await tx.milestone.update({
			where: { id: milestone.id },
			data: {
				isDeleted: true,
				deletedAt: new Date(),
				deletedBy: clientUserId
			}
		})
	})

	if (r2Objects.length > 0) {
		await Promise.allSettled(r2Objects.map(object => deleteR2Object(object.bucket, object.key).catch(() => undefined)))
	}
}

const payMilestone = async (
	clientUserId: string,
	contractId: string,
	milestoneId: string,
	payload: PayMilestoneInput
) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)

	const milestoneRecord = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		include: {
			escrow: true
		}
	})

	if (!milestoneRecord) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	if (milestoneRecord.status === MilestoneStatus.CANCELED) {
		throw new BadRequestException('Milestone đã bị hủy', ErrorCode.PARAM_QUERY_ERROR)
	}

	const escrow = milestoneRecord.escrow

	if (!escrow) {
		throw new NotFoundException('Milestone chưa có escrow', ErrorCode.ITEM_NOT_FOUND)
	}

	if (Number(escrow.amountFunded) >= Number(milestoneRecord.amount)) {
		throw new BadRequestException('Milestone đã được thanh toán', ErrorCode.PARAM_QUERY_ERROR)
	}

	const paymentMethod = await prismaClient.paymentMethodRef.findFirst({
		where: {
			paymentMethodId: payload.paymentMethodRefId,
			profileId: clientUserId
		}
	})

	if (!paymentMethod) {
		throw new NotFoundException('Không tìm thấy phương thức thanh toán', ErrorCode.ITEM_NOT_FOUND)
	}

	if (!paymentMethod.stripeCustomerId) {
		throw new BadRequestException('Phương thức thanh toán chưa được liên kết Stripe', ErrorCode.PARAM_QUERY_ERROR)
	}

	const stripe = getStripeClient()
	const currency = milestoneRecord.currency.toLowerCase()
	const amountInMinorUnit = toMinorUnitAmount(milestoneRecord.amount, currency)
	const idempotencyKey = payload.idempotencyKey?.trim()

	try {
		const paymentIntent = await stripe.paymentIntents.create(
			{
				amount: amountInMinorUnit,
				currency,
				customer: paymentMethod.stripeCustomerId,
				payment_method: paymentMethod.paymentMethodId,
				confirm: true,
				off_session: true,
				description: `Funding milestone ${milestoneRecord.title}`,
				transfer_group: `milestone_${milestoneRecord.id}`,
				metadata: {
					contractId,
					milestoneId,
					clientId: clientUserId,
					paymentMethodRefId: paymentMethod.id
				},
				expand: ['latest_charge.payment_method_details.card']
			},
			idempotencyKey ? { idempotencyKey } : undefined
		)

		const latestCharge = paymentIntent.latest_charge
		let cardDetails: Stripe.Charge.PaymentMethodDetails.Card | null = null
		let chargeId: string | null = null

		if (latestCharge && typeof latestCharge !== 'string') {
			const charge = latestCharge as Stripe.Charge
			chargeId = charge.id ?? null
			cardDetails = charge.payment_method_details?.card ?? null
		}

		const paymentRecord = await prismaClient.$transaction(async tx => {
			const payment = await tx.payment.create({
				data: {
					escrowId: escrow.id,
					amount: milestoneRecord.amount,
					currency: milestoneRecord.currency,
					status: PaymentStatus.SUCCEEDED,
					paymentIntentId: paymentIntent.id,
					chargeId,
					cardBrand: cardDetails?.brand ?? paymentMethod.brand ?? null,
					cardLast4: cardDetails?.last4 ?? paymentMethod.last4 ?? null,
					cardExpMonth: cardDetails?.exp_month ?? paymentMethod.expMonth ?? null,
					cardExpYear: cardDetails?.exp_year ?? paymentMethod.expYear ?? null,
					cardFingerprint: cardDetails?.fingerprint ?? null,
					idemKey: idempotencyKey ?? null
				}
			})

			await tx.escrow.update({
				where: { id: escrow.id },
				data: {
					amountFunded: escrow.amountFunded.plus(milestoneRecord.amount),
					status: EscrowStatus.FUNDED
				}
			})

			return payment
		})

		const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

		return {
			contractId,
			milestone: serializeMilestone(updatedMilestone),
			payment: serializePayment(paymentRecord),
			requiresAction: false
		}
	} catch (error) {
		if (error instanceof Stripe.errors.StripeCardError) {
			const paymentIntent = error.payment_intent as Stripe.PaymentIntent | undefined

			if (paymentIntent && paymentIntent.status === 'requires_action') {
				const pendingPayment = await prismaClient.payment.upsert({
					where: { paymentIntentId: paymentIntent.id },
					create: {
						escrowId: escrow.id,
						amount: milestoneRecord.amount,
						currency: milestoneRecord.currency,
						status: PaymentStatus.REQUIRES_ACTION,
						paymentIntentId: paymentIntent.id,
						chargeId: null,
						cardBrand: paymentMethod.brand ?? null,
						cardLast4: paymentMethod.last4 ?? null,
						cardExpMonth: paymentMethod.expMonth ?? null,
						cardExpYear: paymentMethod.expYear ?? null,
						cardFingerprint: null,
						idemKey: idempotencyKey ?? null
					},
					update: {
						status: PaymentStatus.REQUIRES_ACTION,
						...(idempotencyKey ? { idemKey: idempotencyKey } : {})
					}
				})

				const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

				return {
					contractId,
					milestone: serializeMilestone(updatedMilestone),
					payment: serializePayment(pendingPayment),
					requiresAction: true,
					clientSecret: paymentIntent.client_secret
				}
			}

			throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
		}

		if (error instanceof Stripe.errors.StripeError) {
			throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
		}

		throw error
	}
}

const submitMilestoneWork = async (
	freelancerUserId: string,
	contractId: string,
	milestoneId: string,
	payload: SubmitMilestoneInput,
	files: readonly Express.Multer.File[]
) => {
	await ensureFreelancerUser(freelancerUserId)
	await ensureContractBelongsToFreelancer(contractId, freelancerUserId)

	const milestoneRecord = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		include: {
			escrow: true
		}
	})

	if (!milestoneRecord) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	if (milestoneRecord.status !== MilestoneStatus.OPEN && milestoneRecord.status !== MilestoneStatus.SUBMITTED) {
		throw new BadRequestException('Milestone không ở trạng thái có thể gửi kết quả', ErrorCode.PARAM_QUERY_ERROR)
	}

	const escrow = milestoneRecord.escrow

	if (!escrow || Number(escrow.amountFunded) < Number(milestoneRecord.amount)) {
		throw new BadRequestException('Milestone chưa được thanh toán đầy đủ', ErrorCode.PARAM_QUERY_ERROR)
	}

	const uploads = await uploadMilestoneSubmissionFiles(contractId, milestoneId, files ?? [])

	try {
		const submissionRecord = await prismaClient.$transaction(async tx => {
			const created = await tx.milestoneSubmission.create({
				data: {
					milestoneId,
					freelancerId: freelancerUserId,
					message: payload.message ?? null
				}
			})

			for (const item of uploads) {
				const meta: Prisma.JsonObject = { originalName: item.file.originalname }
				const asset = await tx.asset.create({
					data: {
						provider: AssetProvider.R2,
						kind: determineAssetKind(item.file.mimetype),
						bucket: item.object.bucket,
						storageKey: item.object.key,
						url: item.object.url,
						mimeType: item.file.mimetype,
						bytes: item.file.size ?? null,
						createdBy: freelancerUserId,
						status: AssetStatus.READY,
						meta
					}
				})

				await tx.milestoneSubmissionAttachment.create({
					data: {
						submissionId: created.id,
						assetId: asset.id,
						url: item.object.url,
						name: item.file.originalname,
						mimeType: item.file.mimetype,
						size: item.file.size ?? null,
						metadata: meta
					}
				})
			}

			const hydratedSubmission = await tx.milestoneSubmission.findUnique({
				where: { id: created.id },
				include: milestoneSubmissionInclude
			})

			if (!hydratedSubmission) {
				throw new NotFoundException('Không thể tải submission sau khi tạo', ErrorCode.ITEM_NOT_FOUND)
			}

			await tx.milestone.update({
				where: { id: milestoneRecord.id },
				data: {
					status: MilestoneStatus.SUBMITTED,
					submittedAt: new Date()
				}
			})

			return hydratedSubmission
		})

		const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

		return {
			contractId,
			milestone: serializeMilestone(updatedMilestone),
			submission: serializeMilestoneSubmission(submissionRecord)
		}
	} catch (error) {
		await cleanupMilestoneSubmissionUploads(uploads)
		throw error
	}
}

const approveMilestoneSubmission = async (
	clientUserId: string,
	contractId: string,
	milestoneId: string,
	submissionId: string,
	payload: ApproveMilestoneSubmissionInput
) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)

	const milestoneRecord = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		},
		include: {
			escrow: true,
			contract: {
				select: {
					freelancer: {
						select: {
							userId: true,
							connectAccount: true
						}
					}
				}
			}
		}
	})

	if (!milestoneRecord) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	if (milestoneRecord.status !== MilestoneStatus.SUBMITTED) {
		throw new BadRequestException('Milestone chưa ở trạng thái chờ duyệt', ErrorCode.PARAM_QUERY_ERROR)
	}

	if (milestoneRecord.approvedSubmissionId) {
		throw new BadRequestException('Milestone đã được duyệt trước đó', ErrorCode.PARAM_QUERY_ERROR)
	}

	const escrow = milestoneRecord.escrow

	if (!escrow) {
		throw new NotFoundException('Milestone chưa có escrow', ErrorCode.ITEM_NOT_FOUND)
	}

	if (Number(escrow.amountFunded) < Number(milestoneRecord.amount)) {
		throw new BadRequestException('Milestone chưa được thanh toán đầy đủ', ErrorCode.PARAM_QUERY_ERROR)
	}

	const submissionRecord = await prismaClient.milestoneSubmission.findFirst({
		where: {
			id: submissionId,
			milestoneId
		},
		include: milestoneSubmissionInclude
	})

	if (!submissionRecord) {
		throw new NotFoundException('Không tìm thấy submission', ErrorCode.ITEM_NOT_FOUND)
	}

	if (submissionRecord.status !== MilestoneSubmissionStatus.PENDING) {
		throw new BadRequestException('Submission không ở trạng thái chờ duyệt', ErrorCode.PARAM_QUERY_ERROR)
	}

	const connectAccountId = milestoneRecord.contract?.freelancer?.connectAccount?.stripeAccountId ?? null

	if (!connectAccountId) {
		throw new BadRequestException('Freelancer chưa liên kết Stripe Connect', ErrorCode.PARAM_QUERY_ERROR)
	}

	const stripe = getStripeClient()
	let transfer: Stripe.Transfer

	try {
		transfer = await stripe.transfers.create({
			amount: toMinorUnitAmount(milestoneRecord.amount, milestoneRecord.currency),
			currency: milestoneRecord.currency.toLowerCase(),
			destination: connectAccountId,
			transfer_group: `milestone_${milestoneRecord.id}`,
			metadata: {
				contractId,
				milestoneId,
				submissionId
			}
		})
	} catch (error) {
		if (error instanceof Stripe.errors.StripeError) {
			throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
		}

		throw error
	}

	const now = new Date()

	const { submission, transfer: transferRecord } = await prismaClient.$transaction(async tx => {
		const approvedSubmission = await tx.milestoneSubmission.update({
			where: { id: submissionRecord.id },
			data: {
				status: MilestoneSubmissionStatus.APPROVED,
				reviewNote: payload.reviewNote ?? null,
				reviewRating: payload.reviewRating,
				reviewedAt: now,
				reviewedById: clientUserId
			},
			include: milestoneSubmissionInclude
		})

		await tx.milestoneSubmission.updateMany({
			where: {
				milestoneId,
				id: { not: submissionRecord.id },
				status: MilestoneSubmissionStatus.PENDING
			},
			data: {
				status: MilestoneSubmissionStatus.REJECTED
			}
		})

		await tx.milestone.update({
			where: { id: milestoneRecord.id },
			data: {
				status: MilestoneStatus.RELEASED,
				approvedSubmissionId: submissionRecord.id,
				approvedAt: now,
				releasedAt: now
			}
		})

		const escrowUpdate = await tx.escrow.update({
			where: { id: escrow.id },
			data: {
				amountReleased: escrow.amountReleased.plus(milestoneRecord.amount),
				status: EscrowStatus.RELEASED
			}
		})

		const createdTransfer = await tx.transfer.create({
			data: {
				escrowId: escrowUpdate.id,
				amount: milestoneRecord.amount,
				currency: milestoneRecord.currency,
				status: TransferStatus.SUCCEEDED,
				transferId: transfer.id,
				destinationAccountId: connectAccountId
			}
		})

		return { submission: approvedSubmission, transfer: createdTransfer }
	})

	const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

	return {
		contractId,
		milestone: serializeMilestone(updatedMilestone),
		submission: serializeMilestoneSubmission(submission),
		transfer: serializeTransfer(transferRecord)
	}
}

const declineMilestoneSubmission = async (
	clientUserId: string,
	contractId: string,
	milestoneId: string,
	submissionId: string,
	payload: DeclineMilestoneSubmissionInput
) => {
	await ensureClientUser(clientUserId)
	await ensureContractBelongsToClient(contractId, clientUserId)

	const milestoneRecord = await prismaClient.milestone.findFirst({
		where: {
			id: milestoneId,
			contractId,
			isDeleted: false
		}
	})

	if (!milestoneRecord) {
		throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
	}

	if (milestoneRecord.status !== MilestoneStatus.SUBMITTED) {
		throw new BadRequestException('Milestone không ở trạng thái chờ duyệt', ErrorCode.PARAM_QUERY_ERROR)
	}

	const submissionRecord = await prismaClient.milestoneSubmission.findFirst({
		where: {
			id: submissionId,
			milestoneId
		},
		include: milestoneSubmissionInclude
	})

	if (!submissionRecord) {
		throw new NotFoundException('Không tìm thấy submission', ErrorCode.ITEM_NOT_FOUND)
	}

	if (submissionRecord.status !== MilestoneSubmissionStatus.PENDING) {
		throw new BadRequestException('Submission không ở trạng thái chờ duyệt', ErrorCode.PARAM_QUERY_ERROR)
	}

	const now = new Date()

	const declinedSubmission = await prismaClient.$transaction(async tx => {
		const updated = await tx.milestoneSubmission.update({
			where: { id: submissionRecord.id },
			data: {
				status: MilestoneSubmissionStatus.REJECTED,
				reviewNote: payload.reviewNote,
				reviewRating: payload.reviewRating ?? null,
				reviewedAt: now,
				reviewedById: clientUserId
			},
			include: milestoneSubmissionInclude
		})

		await tx.milestone.update({
			where: { id: milestoneRecord.id },
			data: {
				status: MilestoneStatus.OPEN,
				submittedAt: null,
				approvedSubmissionId: null,
				approvedAt: null,
				releasedAt: null
			}
		})

		return updated
	})

	const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

	return {
		contractId,
		milestone: serializeMilestone(updatedMilestone),
		submission: serializeMilestoneSubmission(declinedSubmission)
	}
}

const contractService = {
	listContracts,
	getContractDetail,
	listContractMilestones,
	listMilestoneResources,
	createContractMilestone,
	uploadMilestoneResources,
	deleteMilestoneResource,
	deleteContractMilestone,
	payMilestone,
	submitMilestoneWork,
	approveMilestoneSubmission,
	declineMilestoneSubmission
}

export default contractService
