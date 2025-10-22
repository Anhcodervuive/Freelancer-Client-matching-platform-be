import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Express } from 'express'
import Stripe from 'stripe'

import {
        AssetKind,
        AssetProvider,
        AssetStatus,
        DisputeNegotiationStatus,
        DisputeStatus,
        EscrowStatus,
        MilestoneCancellationStatus,
        MilestoneStatus,
        MilestoneSubmissionStatus,
        NotificationCategory,
        NotificationEvent,
        NotificationResource,
        PaymentStatus,
        PaymentType,
        RefundStatus,
        Prisma,
        Role,
        TransferStatus,
        User
} from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { CLIENT, R2_CONFIG, STRIPE_CONFIG_INFO } from '~/config/environment'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import {
        ApproveMilestoneSubmissionInput,
        CancelMilestoneInput,
        ConfirmArbitrationFeeInput,
        ContractListFilterInput,
        CreateContractMilestoneInput,
        CreateDisputeNegotiationInput,
        DeclineMilestoneSubmissionInput,
        OpenMilestoneDisputeInput,
        PayMilestoneInput,
        RespondDisputeNegotiationInput,
        RespondMilestoneCancellationInput,
        SubmitMilestoneInput,
        UpdateDisputeNegotiationInput
} from '~/schema/contract.schema'
import { deleteR2Object, uploadBufferToR2 } from '~/providers/r2.provider'
import { InternalServerException } from '~/exceptions/internal-server'
import notificationService from '~/services/notification.service'
import { emailQueue } from '~/queues/email.queue'

type ContractAuthUser = Pick<User, 'id' | 'role'>

const isAdminUser = (user: ContractAuthUser) => user.role === Role.ADMIN

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

const disputeContextInclude = Prisma.validator<Prisma.DisputeInclude>()({
        escrow: {
                select: {
                        id: true,
                        status: true,
                        currency: true,
                        amountFunded: true,
                        amountReleased: true,
                        amountRefunded: true,
                        milestone: {
                                select: {
                                        id: true,
                                        title: true,
                                        status: true,
                                        amount: true,
                                        currency: true,
                                        startAt: true,
                                        endAt: true,
                                        updatedAt: true,
                                        contractId: true,
                                        contract: {
                                                select: {
                                                        id: true,
                                                        title: true,
                                                        clientId: true,
                                                        freelancerId: true
                                                }
                                        }
                                }
                        }
                }
        },
        latestProposal: true
})

const contractDisputeMilestoneSelect = Prisma.validator<Prisma.MilestoneSelect>()({
        id: true,
        contractId: true,
        title: true,
        amount: true,
        currency: true,
        status: true,
        startAt: true,
        endAt: true,
        updatedAt: true,
        escrow: {
                select: {
                        id: true,
                        status: true,
                        currency: true,
                        amountFunded: true,
                        amountReleased: true,
                        amountRefunded: true,
                        dispute: {
                                include: {
                                        latestProposal: true
                                }
                        }
                }
        }
})

const disputeDetailInclude = Prisma.validator<Prisma.DisputeInclude>()({
        latestProposal: true,
        negotiations: {
                orderBy: { createdAt: 'asc' }
        },
        escrow: {
                select: {
                        id: true,
                        status: true,
                        currency: true,
                        amountFunded: true,
                        amountReleased: true,
                        amountRefunded: true,
                        milestone: {
                                select: {
                                        id: true,
                                        title: true,
                                        status: true,
                                        amount: true,
                                        currency: true,
                                        startAt: true,
                                        endAt: true,
                                        updatedAt: true,
                                        contractId: true,
                                        contract: {
                                                select: {
                                                        id: true,
                                                        title: true,
                                                        clientId: true,
                                                        freelancerId: true
                                                }
                                        }
                                }
                        }
                }
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
type PaymentEntity = Prisma.PaymentGetPayload<Prisma.PaymentDefaultArgs>
type TransferEntity = Prisma.TransferGetPayload<{}>
type RefundEntity = Prisma.RefundGetPayload<{}>
type DisputeNegotiationEntity = Prisma.DisputeNegotiationGetPayload<{}>
type DisputeEntity = Prisma.DisputeGetPayload<{ include: { latestProposal: true } }>
type DisputeContextPayload = Prisma.DisputeGetPayload<{ include: typeof disputeContextInclude }>
type DisputeEscrowPayload = NonNullable<DisputeContextPayload['escrow']>
type DisputeMilestonePayload = NonNullable<DisputeEscrowPayload['milestone']>
type DisputeContractPayload = NonNullable<DisputeMilestonePayload['contract']>
type ContractDisputeMilestonePayload = Prisma.MilestoneGetPayload<{ select: typeof contractDisputeMilestoneSelect }>
type DisputeDetailPayload = Prisma.DisputeGetPayload<{ include: typeof disputeDetailInclude }>
type DisputeDetailEscrowPayload = NonNullable<DisputeDetailPayload['escrow']>
type DisputeDetailMilestonePayload = NonNullable<DisputeDetailEscrowPayload['milestone']>
type DisputeDetailContractPayload = NonNullable<DisputeDetailMilestonePayload['contract']>
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
			currency: true,
			freelancerId: true
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
			currency: true,
			clientId: true
		}
	})

	if (!contract || contract.freelancerId !== freelancerId) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

return contract
}

type ContractParticipantIds = {
        clientId: string | null
        freelancerId: string | null
}

const notifyMilestoneParticipants = async (
        contract: ContractParticipantIds,
        actorId: string,
        notification: {
                event: NotificationEvent
                resourceType: NotificationResource
                resourceId: string
                payload: Record<string, unknown>
        },
        errorMessage: string
) => {
        const recipients = new Set<string>()

        if (contract.clientId) {
                recipients.add(contract.clientId)
        }

        if (contract.freelancerId) {
                recipients.add(contract.freelancerId)
        }

        await Promise.all(
                Array.from(recipients).map(async recipientId => {
                        try {
                                await notificationService.create({
                                        recipientId,
                                        actorId,
                                        category: NotificationCategory.CONTRACT,
                                        event: notification.event,
                                        resourceType: notification.resourceType,
                                        resourceId: notification.resourceId,
                                        payload: notification.payload
                                })
                        } catch (notificationError) {
                                // eslint-disable-next-line no-console
                                console.error(errorMessage, notificationError)
                        }
                })
        )
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

const mapStripeRefundStatus = (status?: Stripe.Refund['status'] | null): RefundStatus => {
        if (status === 'succeeded') {
                return RefundStatus.SUCCEEDED
        }

        if (status === 'pending') {
                return RefundStatus.PENDING
        }

        return RefundStatus.FAILED
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
                cancellationStatus: milestone.cancellationStatus ?? null,
                cancellationRequestedAt: milestone.cancellationRequestedAt ?? null,
                cancellationReason: milestone.cancellationReason ?? null,
                cancellationRespondedAt: milestone.cancellationRespondedAt ?? null,
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

type EscrowSummarySource = {
        id: string
        status: EscrowStatus
        currency: string
        amountFunded: Prisma.Decimal
        amountReleased: Prisma.Decimal
        amountRefunded: Prisma.Decimal
}

type DisputeMilestoneLike = {
        id: string
        contractId: string
        title: string
        status: MilestoneStatus
        amount: Prisma.Decimal
        currency: string
        startAt: Date | null
        endAt: Date | null
        updatedAt: Date
}

const serializeEscrowSummary = (escrow: EscrowSummarySource) => {
        return {
                id: escrow.id,
                status: escrow.status,
                currency: escrow.currency,
                amountFunded: Number(escrow.amountFunded),
                amountReleased: Number(escrow.amountReleased),
                amountRefunded: Number(escrow.amountRefunded)
        }
}

const serializeDisputeMilestoneSummary = (milestone: DisputeMilestoneLike) => {
        return {
                id: milestone.id,
                contractId: milestone.contractId,
                title: milestone.title,
                status: milestone.status,
                amount: Number(milestone.amount),
                currency: milestone.currency,
                startAt: milestone.startAt ?? null,
                endAt: milestone.endAt ?? null,
                updatedAt: milestone.updatedAt
        }
}

const serializeMilestoneDisputeOverview = (milestone: ContractDisputeMilestonePayload) => {
        const escrow = milestone.escrow
        const dispute = escrow?.dispute ? serializeDispute(escrow.dispute) : null

        return {
                ...serializeDisputeMilestoneSummary(milestone),
                escrow: escrow ? serializeEscrowSummary(escrow) : null,
                dispute
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

const serializeRefund = (refund: RefundEntity) => {
        return {
                id: refund.id,
                escrowId: refund.escrowId,
                paymentId: refund.paymentId,
                amount: Number(refund.amount),
                currency: refund.currency,
                status: refund.status,
                stripeRefundId: refund.stripeRefundId ?? null,
                idemKey: refund.idemKey ?? null,
                createdAt: refund.createdAt,
                updatedAt: refund.updatedAt
        }
}

const serializeDisputeNegotiation = (negotiation: DisputeNegotiationEntity) => {
        return {
                id: negotiation.id,
                disputeId: negotiation.disputeId,
                proposerId: negotiation.proposerId,
                counterpartyId: negotiation.counterpartyId,
                status: negotiation.status,
                releaseAmount: Number(negotiation.releaseAmount),
                refundAmount: Number(negotiation.refundAmount),
                message: negotiation.message ?? null,
                respondedById: negotiation.respondedById ?? null,
                respondedAt: negotiation.respondedAt ?? null,
                responseMessage: negotiation.responseMessage ?? null,
                createdAt: negotiation.createdAt,
                updatedAt: negotiation.updatedAt
        }
}

const serializeDispute = (dispute: DisputeEntity) => {
        return {
                id: dispute.id,
                escrowId: dispute.escrowId,
                openedById: dispute.openedById,
                status: dispute.status,
                latestProposalId: dispute.latestProposalId ?? null,
                proposedRelease: Number(dispute.proposedRelease),
                proposedRefund: Number(dispute.proposedRefund),
                arbFeePerParty: Number(dispute.arbFeePerParty),
                clientArbFeePaid: dispute.clientArbFeePaid,
                freelancerArbFeePaid: dispute.freelancerArbFeePaid,
                responseDeadline: dispute.responseDeadline ?? null,
                arbitrationDeadline: dispute.arbitrationDeadline ?? null,
                decidedRelease: Number(dispute.decidedRelease),
                decidedRefund: Number(dispute.decidedRefund),
                decidedById: dispute.decidedById ?? null,
                note: dispute.note ?? null,
                createdAt: dispute.createdAt,
                updatedAt: dispute.updatedAt,
                latestProposal: dispute.latestProposal
                        ? serializeDisputeNegotiation(dispute.latestProposal)
                        : null
        }
}

const FIVE_DAYS_IN_MS = 5 * 24 * 60 * 60 * 1000

const centsFromDecimal = (value: Prisma.Decimal) => {
        return Number(value.mul(100).toFixed(0))
}

const computeDisputableCents = (
        escrow: Pick<DisputeEscrowPayload, 'amountFunded' | 'amountReleased' | 'amountRefunded'>
) => {
        const disputable = escrow.amountFunded.minus(escrow.amountReleased).minus(escrow.amountRefunded)
        return Math.max(0, Number(disputable.mul(100).toFixed(0)))
}

const centsToDecimalString = (cents: number) => (cents / 100).toFixed(2)

const composeFullName = (profile?: { firstName: string | null; lastName: string | null } | null) => {
        const firstName = profile?.firstName?.trim() ?? ''
        const lastName = profile?.lastName?.trim() ?? ''
        const combined = `${firstName} ${lastName}`.trim()
        return combined.length > 0 ? combined : null
}

const ensureDisputeContext = async (
        contractId: string,
        milestoneId: string,
        disputeId: string,
        userId: string,
        allowedStatuses: DisputeStatus[] = [DisputeStatus.OPEN, DisputeStatus.NEGOTIATION]
) => {
        const dispute = await prismaClient.dispute.findUnique({
                where: { id: disputeId },
                include: disputeContextInclude
        })

        if (!dispute || !dispute.escrow || !dispute.escrow.milestone || !dispute.escrow.milestone.contract) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        const escrow = dispute.escrow as DisputeEscrowPayload
        const milestone = escrow.milestone as DisputeMilestonePayload
        const contract = milestone.contract as DisputeContractPayload

        if (milestone.id !== milestoneId || milestone.contractId !== contractId || contract.id !== contractId) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (contract.clientId !== userId && contract.freelancerId !== userId) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (!allowedStatuses.includes(dispute.status)) {
                throw new BadRequestException(
                        'Tranh chấp không ở trạng thái phù hợp để thực hiện thao tác này',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        return { dispute: dispute as DisputeContextPayload, escrow, milestone, contract }
}

const loadUserContact = async (userId: string) => {
        const user = await prismaClient.user.findUnique({
                where: { id: userId },
                select: {
                        email: true,
                        profile: {
                                select: {
                                        firstName: true,
                                        lastName: true
                                }
                        }
                }
        })

        if (!user) {
                throw new NotFoundException('Không tìm thấy người dùng', ErrorCode.ITEM_NOT_FOUND)
        }

        const displayName = composeFullName(user.profile) ?? user.email

        return {
                email: user.email,
                name: displayName
        }
}

const queueDisputeNegotiationEmail = async (params: {
        action: 'created' | 'updated' | 'deleted' | 'accepted' | 'rejected'
        actorId: string
        recipientId: string
        dispute: DisputeContextPayload
        releaseAmount: number
        refundAmount: number
        message?: string | null
}) => {
        const [actor, recipient] = await Promise.all([
                loadUserContact(params.actorId),
                loadUserContact(params.recipientId)
        ])

        const escrow = params.dispute.escrow as DisputeEscrowPayload
        const milestone = escrow.milestone as DisputeMilestonePayload
        const contract = milestone.contract as DisputeContractPayload
        const disputeUrl = `${CLIENT.URL}/contracts/${contract.id}/milestones/${milestone.id}/disputes`

        await emailQueue.add('sendDisputeNegotiationEmail', {
                to: recipient.email,
                recipientName: recipient.name,
                payload: {
                        action: params.action,
                        actorName: actor.name,
                        milestoneTitle: milestone.title,
                        contractTitle: contract.title,
                        disputeUrl,
                        releaseAmount: params.releaseAmount,
                        refundAmount: params.refundAmount,
                        currency: escrow.currency,
                        message: params.message ?? null,
                        showDeadlineNotice: params.action === 'created' || params.action === 'updated'
                }
        })
}

const ensureContractAccess = async (
        contractId: string,
        user: ContractAuthUser,
        options: { allowAdmin?: boolean } = {}
) => {
        const allowAdmin = options.allowAdmin ?? false
        const where: Prisma.ContractWhereInput = { id: contractId }

        if (!(allowAdmin && isAdminUser(user))) {
                where.OR = [{ clientId: user.id }, { freelancerId: user.id }]
        }

        const contract = await prismaClient.contract.findFirst({
                where,
                select: { id: true }
        })

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }
}

const buildContractWhere = (
        user: ContractAuthUser,
        filters: ContractListFilterInput
): Prisma.ContractWhereInput => {
        const andConditions: Prisma.ContractWhereInput[] = []

        if (!isAdminUser(user)) {
                if (filters.role === 'client') {
                        andConditions.push({ clientId: user.id })
                } else if (filters.role === 'freelancer') {
                        andConditions.push({ freelancerId: user.id })
                } else {
                        andConditions.push({ OR: [{ clientId: user.id }, { freelancerId: user.id }] })
                }
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

        if (andConditions.length === 0) {
                return {}
        }

        if (andConditions.length === 1) {
                return andConditions[0]!
        }

        return { AND: andConditions }
}

const listContracts = async (user: ContractAuthUser, filters: ContractListFilterInput) => {
        const page = filters.page
        const limit = filters.limit
        const skip = (page - 1) * limit
        const where = buildContractWhere(user, filters)

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

const getContractDetail = async (user: ContractAuthUser, contractId: string) => {
        const where: Prisma.ContractWhereInput = { id: contractId }

        if (!isAdminUser(user)) {
                where.OR = [{ clientId: user.id }, { freelancerId: user.id }]
        }

        const contract = await prismaClient.contract.findFirst({
                where,
                include: contractDetailInclude
        })

	if (!contract) {
		throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
	}

	return serializeContractDetail(contract)
}

const listContractMilestones = async (user: ContractAuthUser, contractId: string) => {
        await ensureContractAccess(contractId, user, { allowAdmin: true })

	const milestones = await prismaClient.milestone.findMany({
		where: { contractId, isDeleted: false },
		include: milestoneInclude,
		orderBy: { updatedAt: 'desc' }
	})

	return milestones.map(serializeMilestone)
}

const listMilestoneResources = async (
        user: ContractAuthUser,
        contractId: string,
        milestoneId: string
) => {
        await ensureContractAccess(contractId, user, { allowAdmin: true })

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

const listContractDisputes = async (user: ContractAuthUser, contractId: string) => {
        const where: Prisma.ContractWhereInput = { id: contractId }

        if (!isAdminUser(user)) {
                where.OR = [{ clientId: user.id }, { freelancerId: user.id }]
        }

        const contract = await prismaClient.contract.findFirst({
                where,
                select: {
                        id: true,
                        title: true,
                        clientId: true,
                        freelancerId: true,
                        milestones: {
                                where: { isDeleted: false },
                                orderBy: { updatedAt: 'desc' },
                                select: contractDisputeMilestoneSelect
                        }
                }
        })

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        return {
                contract: {
                        id: contract.id,
                        title: contract.title,
                        clientId: contract.clientId,
                        freelancerId: contract.freelancerId
                },
                milestones: contract.milestones.map(milestone => serializeMilestoneDisputeOverview(milestone))
        }
}

const getMilestoneDispute = async (
        user: ContractAuthUser,
        contractId: string,
        milestoneId: string
) => {
        await ensureContractAccess(contractId, user, { allowAdmin: true })

        const milestone = await prismaClient.milestone.findFirst({
                where: { id: milestoneId, contractId, isDeleted: false },
                select: {
                        id: true,
                        contractId: true,
                        title: true,
                        status: true,
                        amount: true,
                        currency: true,
                        startAt: true,
                        endAt: true,
                        updatedAt: true,
                        contract: {
                                select: {
                                        id: true,
                                        title: true,
                                        clientId: true,
                                        freelancerId: true
                                }
                        },
                        escrow: {
                                select: {
                                        id: true,
                                        status: true,
                                        currency: true,
                                        amountFunded: true,
                                        amountReleased: true,
                                        amountRefunded: true,
                                        dispute: {
                                                select: { id: true }
                                        }
                                }
                        }
                }
        })

        if (!milestone) {
                throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
        }

        const escrow = milestone.escrow
        const contract = milestone.contract

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        const escrowSummary = escrow ? serializeEscrowSummary(escrow) : null

        let disputableAmount = 0
        let disputableCents = 0

        if (escrow) {
                const disputable = escrow.amountFunded.minus(escrow.amountReleased).minus(escrow.amountRefunded)
                disputableAmount = Math.max(0, Number(disputable))
                disputableCents = Math.max(0, Number(disputable.mul(100).toFixed(0)))
        }

        if (!escrow || !escrow.dispute) {
                return {
                        contract: {
                                id: contract.id,
                                title: contract.title,
                                clientId: contract.clientId,
                                freelancerId: contract.freelancerId
                        },
                        milestone: {
                                ...serializeDisputeMilestoneSummary(milestone),
                                escrow: escrowSummary
                        },
                        dispute: null,
                        negotiations: [],
                        disputableAmount,
                        disputableCents
                }
        }

        const disputeRecord = await prismaClient.dispute.findUnique({
                where: { id: escrow.dispute.id },
                include: disputeDetailInclude
        })

        if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        const disputeEscrow = disputeRecord.escrow as DisputeDetailEscrowPayload
        const disputeMilestone = disputeEscrow.milestone as DisputeDetailMilestonePayload
        const disputeContract = disputeMilestone.contract as DisputeDetailContractPayload

        if (disputeContract.id !== contractId || disputeMilestone.id !== milestoneId) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (!isAdminUser(user) && disputeContract.clientId !== user.id && disputeContract.freelancerId !== user.id) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        const disputable = disputeEscrow.amountFunded
                .minus(disputeEscrow.amountReleased)
                .minus(disputeEscrow.amountRefunded)
        disputableAmount = Math.max(0, Number(disputable))
        disputableCents = Math.max(0, Number(disputable.mul(100).toFixed(0)))

        return {
                contract: {
                        id: disputeContract.id,
                        title: disputeContract.title,
                        clientId: disputeContract.clientId,
                        freelancerId: disputeContract.freelancerId
                },
                milestone: {
                        ...serializeDisputeMilestoneSummary(disputeMilestone),
                        escrow: serializeEscrowSummary(disputeEscrow)
                },
                dispute: serializeDispute(disputeRecord),
                negotiations: disputeRecord.negotiations.map(serializeDisputeNegotiation),
                disputableAmount,
                disputableCents
        }
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

        await notifyMilestoneParticipants(
                contract,
                clientUserId,
                {
                        event: NotificationEvent.CONTRACT_MILESTONE_CREATED,
                        resourceType: NotificationResource.CONTRACT_MILESTONE,
                        resourceId: milestone.id,
                        payload: {
                                contractId,
                                milestoneId: milestone.id,
                                milestoneTitle: milestone.title
                        }
                },
                'Không thể tạo thông báo khi tạo milestone'
        )

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
                        escrow: {
                                select: {
                                        id: true,
                                        status: true,
                                        amountFunded: true
                                }
                        },
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

        const escrow = milestone.escrow

        if (escrow && (escrow.status !== EscrowStatus.UNFUNDED || Number(escrow.amountFunded) > 0)) {
                throw new BadRequestException('Không thể xóa milestone đã được fund', ErrorCode.PARAM_QUERY_ERROR)
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

const cancelMilestone = async (
        clientUserId: string,
        contractId: string,
        milestoneId: string,
        payload: CancelMilestoneInput
) => {
        await ensureClientUser(clientUserId)
        const contract = await ensureContractBelongsToClient(contractId, clientUserId)

        const milestone = await prismaClient.milestone.findFirst({
                where: {
                        id: milestoneId,
                        contractId,
                        isDeleted: false
                },
                include: {
                        escrow: true
                }
        })

        if (!milestone) {
                throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
        }

        if (milestone.status === MilestoneStatus.CANCELED) {
                throw new BadRequestException('Milestone đã bị hủy trước đó', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (milestone.status === MilestoneStatus.APPROVED || milestone.status === MilestoneStatus.RELEASED) {
                throw new BadRequestException('Milestone đã được duyệt nên không thể hủy', ErrorCode.PARAM_QUERY_ERROR)
        }

        const escrow = milestone.escrow

        if (!escrow) {
                throw new NotFoundException('Milestone chưa có escrow', ErrorCode.ITEM_NOT_FOUND)
        }

        if (escrow.status === EscrowStatus.UNFUNDED || Number(escrow.amountFunded) === 0) {
                throw new BadRequestException('Milestone chưa được fund nên không thể hủy', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (milestone.cancellationStatus === MilestoneCancellationStatus.PENDING) {
                throw new BadRequestException('Milestone đang chờ freelancer phản hồi yêu cầu hủy', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (milestone.cancellationStatus === MilestoneCancellationStatus.ACCEPTED) {
                throw new BadRequestException('Milestone đã được xử lý hủy', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (milestone.cancellationStatus === MilestoneCancellationStatus.DECLINED) {
                throw new BadRequestException(
                        'Yêu cầu hủy trước đó đã bị từ chối, vui lòng mở dispute để được hỗ trợ',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const cancellationReason = payload.reason ? payload.reason.trim() : null

        const updatedMilestone = await prismaClient.milestone.update({
                where: { id: milestone.id },
                data: {
                        cancellationStatus: MilestoneCancellationStatus.PENDING,
                        cancellationRequestedAt: new Date(),
                        cancellationReason,
                        cancellationRespondedAt: null
                },
                include: milestoneInclude
        })

        await notifyMilestoneParticipants(
                contract,
                clientUserId,
                {
                        event: NotificationEvent.CONTRACT_MILESTONE_CANCELLATION_REQUESTED,
                        resourceType: NotificationResource.CONTRACT_MILESTONE,
                        resourceId: updatedMilestone.id,
                        payload: {
                                contractId,
                                milestoneId: updatedMilestone.id,
                                cancellationStatus: updatedMilestone.cancellationStatus
                        }
                },
                'Không thể tạo thông báo khi client yêu cầu hủy milestone'
        )

        return {
                contractId,
                milestone: serializeMilestone(updatedMilestone)
        }
}

const respondMilestoneCancellation = async (
        freelancerUserId: string,
        contractId: string,
        milestoneId: string,
        payload: RespondMilestoneCancellationInput
) => {
        await ensureFreelancerUser(freelancerUserId)
        const contract = await ensureContractBelongsToFreelancer(contractId, freelancerUserId)

        const milestoneRecord = await prismaClient.milestone.findFirst({
                where: {
                        id: milestoneId,
                        contractId,
                        isDeleted: false
                },
                include: {
                        escrow: {
                                include: {
                                        payments: {
                                                where: { status: PaymentStatus.SUCCEEDED },
                                                orderBy: { createdAt: 'desc' },
                                                take: 1
                                        },
                                        dispute: true
                                }
                        }
                }
        })

        if (!milestoneRecord) {
                throw new NotFoundException('Không tìm thấy milestone', ErrorCode.ITEM_NOT_FOUND)
        }

        if (milestoneRecord.status === MilestoneStatus.CANCELED) {
                throw new BadRequestException('Milestone đã bị hủy', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (milestoneRecord.cancellationStatus !== MilestoneCancellationStatus.PENDING) {
                throw new BadRequestException(
                        'Milestone không có yêu cầu hủy đang chờ xử lý',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const escrow = milestoneRecord.escrow

        if (!escrow) {
                throw new NotFoundException('Milestone chưa có escrow', ErrorCode.ITEM_NOT_FOUND)
        }

        if (Number(escrow.amountFunded) === 0) {
                throw new BadRequestException('Milestone chưa được thanh toán', ErrorCode.PARAM_QUERY_ERROR)
        }

        const succeededPayment = escrow.payments?.[0] ?? null

        if (!succeededPayment) {
                throw new BadRequestException('Không tìm thấy giao dịch thanh toán để hoàn tiền', ErrorCode.PARAM_QUERY_ERROR)
        }

        const now = new Date()
        const action = payload.action

        if (action === 'accept') {
                if (Number(escrow.amountReleased) > 0) {
                        throw new BadRequestException(
                                'Milestone đã được release nên không thể hoàn tiền',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                if (escrow.dispute) {
                        throw new BadRequestException('Milestone đang trong tranh chấp, không thể hoàn tiền', ErrorCode.PARAM_QUERY_ERROR)
                }

                const stripe = getStripeClient()
                const existingRefund = await prismaClient.refund.findUnique({
                        where: { paymentId: succeededPayment.id }
                })
                const effectiveIdempotencyKey = payload.idempotencyKey?.trim() ?? existingRefund?.idemKey ?? null

                let stripeRefund: Stripe.Response<Stripe.Refund> | null = null

                if (existingRefund?.stripeRefundId) {
                        try {
                                stripeRefund = await stripe.refunds.retrieve(existingRefund.stripeRefundId)
                        } catch (error) {
                                if (error instanceof Stripe.errors.StripeError) {
                                        if (error.code !== 'resource_missing') {
                                                throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
                                        }
                                } else {
                                        throw error
                                }
                        }
                }

                if (!stripeRefund) {
                        try {
                                stripeRefund = await stripe.refunds.create(
                                        {
                                                payment_intent: succeededPayment.paymentIntentId,
                                                amount: toMinorUnitAmount(milestoneRecord.amount, milestoneRecord.currency),
                                                reason: 'requested_by_customer',
                                                metadata: {
                                                        contractId,
                                                        milestoneId,
                                                        paymentId: succeededPayment.id
                                                }
                                        },
                                        effectiveIdempotencyKey ? { idempotencyKey: effectiveIdempotencyKey } : undefined
                                )
                        } catch (error) {
                                if (error instanceof Stripe.errors.StripeError) {
                                        throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
                                }

                                throw error
                        }
                }

                if (!stripeRefund) {
                        throw new InternalServerException(
                                'Không thể khởi tạo hoàn tiền cho milestone',
                                ErrorCode.INTERNAL_SERVER_ERROR
                        )
                }

                const refundStatus = mapStripeRefundStatus(stripeRefund.status)

                if (refundStatus !== RefundStatus.SUCCEEDED) {
                        throw new BadRequestException(
                                'Hoàn tiền milestone chưa hoàn tất, vui lòng thử lại sau',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }

                const refundAmount = milestoneRecord.amount
                const refundRecord = await prismaClient.$transaction(async tx => {
                        const updatedRefund = await tx.refund.upsert({
                                where: { paymentId: succeededPayment.id },
                                create: {
                                        escrowId: escrow.id,
                                        paymentId: succeededPayment.id,
                                        amount: refundAmount,
                                        currency: milestoneRecord.currency,
                                        status: refundStatus,
                                        stripeRefundId: stripeRefund.id ?? null,
                                        idemKey: effectiveIdempotencyKey
                                },
                                update: {
                                        amount: refundAmount,
                                        currency: milestoneRecord.currency,
                                        status: refundStatus,
                                        stripeRefundId: stripeRefund.id ?? null,
                                        ...(effectiveIdempotencyKey ? { idemKey: effectiveIdempotencyKey } : {})
                                }
                        })

                        await tx.payment.update({
                                where: { id: succeededPayment.id },
                                data: { status: PaymentStatus.REFUNDED }
                        })

                        const totalRefunded = escrow.amountRefunded.plus(refundAmount)
                        const newEscrowStatus = totalRefunded.gte(escrow.amountFunded)
                                ? EscrowStatus.REFUNDED
                                : EscrowStatus.PARTIALLY_REFUNDED

                        await tx.escrow.update({
                                where: { id: escrow.id },
                                data: {
                                        amountRefunded: totalRefunded,
                                        status: newEscrowStatus
                                }
                        })

                        await tx.milestone.update({
                                where: { id: milestoneRecord.id },
                                data: {
                                        status: MilestoneStatus.CANCELED,
                                        cancellationStatus: MilestoneCancellationStatus.ACCEPTED,
                                        cancellationRespondedAt: now,
                                        approvedSubmissionId: null,
                                        approvedAt: null,
                                        releasedAt: null
                                }
                        })

                        return updatedRefund
                })

                const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

                await notifyMilestoneParticipants(
                        contract,
                        freelancerUserId,
                        {
                                event: NotificationEvent.CONTRACT_MILESTONE_CANCELLATION_REQUESTED,
                                resourceType: NotificationResource.CONTRACT_MILESTONE,
                                resourceId: updatedMilestone.id,
                                payload: {
                                        contractId,
                                        milestoneId: updatedMilestone.id,
                                        cancellationStatus: MilestoneCancellationStatus.ACCEPTED,
                                        action: 'accepted'
                                }
                        },
                        'Không thể tạo thông báo khi freelancer đồng ý hủy milestone'
                )

                return {
                        contractId,
                        action,
                        milestone: serializeMilestone(updatedMilestone),
                        refund: serializeRefund(refundRecord),
                        dispute: null
                }
        }

        if (escrow.dispute) {
                throw new BadRequestException('Milestone đã có tranh chấp đang mở', ErrorCode.PARAM_QUERY_ERROR)
        }

        const disputeNote = payload.reason ? payload.reason.trim() : null

        const disputeRecord = await prismaClient.$transaction(async tx => {
                const createdDispute = await tx.dispute.create({
                        data: {
                                escrowId: escrow.id,
                                openedById: freelancerUserId,
                                note: disputeNote
                        },
                        include: { latestProposal: true }
                })

                await tx.escrow.update({
                        where: { id: escrow.id },
                        data: { status: EscrowStatus.DISPUTED }
                })

                await tx.milestone.update({
                        where: { id: milestoneRecord.id },
                        data: {
                                cancellationStatus: MilestoneCancellationStatus.DECLINED,
                                cancellationRespondedAt: now
                        }
                })

                return createdDispute
        })

        const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

        await notifyMilestoneParticipants(
                contract,
                freelancerUserId,
                {
                        event: NotificationEvent.DISPUTE_CREATED,
                        resourceType: NotificationResource.DISPUTE,
                        resourceId: disputeRecord.id,
                        payload: {
                                contractId,
                                milestoneId,
                                disputeId: disputeRecord.id
                        }
                },
                'Không thể tạo thông báo khi freelancer mở tranh chấp milestone'
        )

        return {
                contractId,
                action,
                milestone: serializeMilestone(updatedMilestone),
                refund: null,
                dispute: serializeDispute(disputeRecord)
        }
}

const openMilestoneDispute = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        payload: OpenMilestoneDisputeInput
) => {
        await ensureContractAccess(contractId, { id: userId, role: null })

        const contract = await prismaClient.contract.findUnique({
                where: { id: contractId },
                select: { clientId: true, freelancerId: true }
        })

        if (!contract) {
                throw new NotFoundException('Không tìm thấy hợp đồng', ErrorCode.ITEM_NOT_FOUND)
        }

        const milestoneRecord = await prismaClient.milestone.findFirst({
                where: {
                        id: milestoneId,
                        contractId,
                        isDeleted: false
                },
                include: {
                        escrow: {
                                include: {
                                        dispute: true
                                }
                        }
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
                throw new BadRequestException('Milestone chưa có escrow', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (escrow.dispute) {
                throw new BadRequestException('Milestone đã có tranh chấp đang mở', ErrorCode.PARAM_QUERY_ERROR)
        }

        const funded = Number(escrow.amountFunded)
        const released = Number(escrow.amountReleased)
        const refunded = Number(escrow.amountRefunded)
        const disputableAmount = funded - released - refunded

        if (disputableAmount <= 0) {
                throw new BadRequestException(
                        'Milestone không còn tiền trong escrow để mở tranh chấp',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const availableCents = Math.round(disputableAmount * 100)
        const isClient = contract.clientId === userId
        const isFreelancer = contract.freelancerId === userId

        const providedReleaseCents =
                payload.proposedRelease !== undefined
                        ? Math.round(payload.proposedRelease * 100)
                        : undefined
        const providedRefundCents =
                payload.proposedRefund !== undefined
                        ? Math.round(payload.proposedRefund * 100)
                        : undefined

        const proposedReleaseCents =
                providedReleaseCents !== undefined
                        ? providedReleaseCents
                        : isFreelancer
                        ? availableCents
                        : 0
        const proposedRefundCents =
                providedRefundCents !== undefined
                        ? providedRefundCents
                        : isClient
                        ? availableCents
                        : 0

        if (proposedReleaseCents < 0 || proposedRefundCents < 0) {
                throw new BadRequestException('Số tiền đề xuất không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (proposedReleaseCents + proposedRefundCents !== availableCents) {
                throw new BadRequestException(
                        'Tổng tiền release/refund phải bằng số tiền đang tranh chấp',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const now = new Date()
        const responseDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
        const disputeNote = payload.reason.trim()

        const releaseValue = (proposedReleaseCents / 100).toFixed(2)
        const refundValue = (proposedRefundCents / 100).toFixed(2)

        const counterpartyId = isClient ? contract.freelancerId : contract.clientId

        const disputeRecord = await prismaClient.$transaction(async tx => {
                const createdDispute = await tx.dispute.create({
                        data: {
                                escrowId: escrow.id,
                                openedById: userId,
                                status: DisputeStatus.OPEN,
                                note: disputeNote,
                                proposedRelease: new Prisma.Decimal(releaseValue),
                                proposedRefund: new Prisma.Decimal(refundValue),
                                responseDeadline
                        }
                })

                const negotiation = await tx.disputeNegotiation.create({
                        data: {
                                disputeId: createdDispute.id,
                                proposerId: userId,
                                counterpartyId,
                                status: DisputeNegotiationStatus.PENDING,
                                releaseAmount: new Prisma.Decimal(releaseValue),
                                refundAmount: new Prisma.Decimal(refundValue),
                                message: disputeNote
                        }
                })

                const disputeWithProposal = await tx.dispute.update({
                        where: { id: createdDispute.id },
                        data: {
                                latestProposalId: negotiation.id,
                                proposedRelease: new Prisma.Decimal(releaseValue),
                                proposedRefund: new Prisma.Decimal(refundValue)
                        },
                        include: { latestProposal: true }
                })

                await tx.escrow.update({
                        where: { id: escrow.id },
                        data: { status: EscrowStatus.DISPUTED }
                })

                return disputeWithProposal
        })

        const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

        await notifyMilestoneParticipants(
                contract,
                userId,
                {
                        event: NotificationEvent.DISPUTE_CREATED,
                        resourceType: NotificationResource.DISPUTE,
                        resourceId: disputeRecord.id,
                        payload: {
                                contractId,
                                milestoneId,
                                disputeId: disputeRecord.id,
                                responseDeadline: responseDeadline.toISOString()
                        }
                },
                'Không thể tạo thông báo khi người dùng mở tranh chấp milestone'
        )

        return {
                contractId,
                milestone: serializeMilestone(updatedMilestone),
                dispute: serializeDispute(disputeRecord)
        }
}

const createDisputeNegotiation = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        disputeId: string,
        payload: CreateDisputeNegotiationInput
) => {
        const context = await ensureDisputeContext(contractId, milestoneId, disputeId, userId)
        const { escrow, contract, dispute } = context

        const availableCents = computeDisputableCents(escrow)

        if (availableCents <= 0) {
                throw new BadRequestException(
                        'Milestone không còn tiền trong escrow để thương lượng',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const releaseCents = Math.round(payload.releaseAmount * 100)
        const refundCents = Math.round(payload.refundAmount * 100)

        if (releaseCents < 0 || refundCents < 0) {
                throw new BadRequestException('Số tiền đề xuất không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (releaseCents + refundCents !== availableCents) {
                throw new BadRequestException(
                        'Tổng tiền release/refund phải bằng số tiền đang tranh chấp',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const counterpartyId = userId === contract.clientId ? contract.freelancerId : contract.clientId

        if (!counterpartyId) {
                throw new BadRequestException('Tranh chấp không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        const releaseValue = centsToDecimalString(releaseCents)
        const refundValue = centsToDecimalString(refundCents)
        const message = payload.message?.trim() ?? null
        const responseDeadline = new Date(Date.now() + FIVE_DAYS_IN_MS)

        const result = await prismaClient.$transaction(async tx => {
                const negotiation = await tx.disputeNegotiation.create({
                        data: {
                                disputeId,
                                proposerId: userId,
                                counterpartyId,
                                status: DisputeNegotiationStatus.PENDING,
                                releaseAmount: new Prisma.Decimal(releaseValue),
                                refundAmount: new Prisma.Decimal(refundValue),
                                message
                        }
                })

                const updatedDispute = await tx.dispute.update({
                        where: { id: disputeId },
                        data: {
                                latestProposalId: negotiation.id,
                                proposedRelease: new Prisma.Decimal(releaseValue),
                                proposedRefund: new Prisma.Decimal(refundValue),
                                responseDeadline,
                                status: DisputeStatus.NEGOTIATION
                        },
                        include: { latestProposal: true }
                })

                return { negotiation, dispute: updatedDispute }
        })

        await queueDisputeNegotiationEmail({
                action: 'created',
                actorId: userId,
                recipientId: counterpartyId,
                dispute,
                releaseAmount: releaseCents / 100,
                refundAmount: refundCents / 100,
                message
        })

        return {
                contractId,
                milestoneId,
                dispute: serializeDispute(result.dispute),
                negotiation: serializeDisputeNegotiation(result.negotiation)
        }
}

const updateDisputeNegotiation = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string,
        payload: UpdateDisputeNegotiationInput
) => {
        const context = await ensureDisputeContext(contractId, milestoneId, disputeId, userId)
        const { escrow, dispute } = context

        const negotiationRecord = await prismaClient.disputeNegotiation.findUnique({
                where: { id: negotiationId }
        })

        if (!negotiationRecord || negotiationRecord.disputeId !== disputeId) {
                throw new NotFoundException('Không tìm thấy đề xuất tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (negotiationRecord.proposerId !== userId) {
                throw new UnauthorizedException(
                        'Bạn không thể cập nhật đề xuất tranh chấp của người khác',
                        ErrorCode.USER_NOT_AUTHORITY
                )
        }

        if (negotiationRecord.status !== DisputeNegotiationStatus.PENDING) {
                throw new BadRequestException(
                        'Đề xuất đã được phản hồi, không thể chỉnh sửa',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        if (dispute.latestProposalId !== negotiationId) {
                throw new BadRequestException(
                        'Chỉ có thể chỉnh sửa đề xuất đang chờ phản hồi',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const availableCents = computeDisputableCents(escrow)
        const currentReleaseCents = centsFromDecimal(negotiationRecord.releaseAmount)
        const currentRefundCents = centsFromDecimal(negotiationRecord.refundAmount)
        const nextReleaseCents =
                payload.releaseAmount !== undefined ? Math.round(payload.releaseAmount * 100) : currentReleaseCents
        const nextRefundCents =
                payload.refundAmount !== undefined ? Math.round(payload.refundAmount * 100) : currentRefundCents

        if (nextReleaseCents < 0 || nextRefundCents < 0) {
                throw new BadRequestException('Số tiền đề xuất không hợp lệ', ErrorCode.PARAM_QUERY_ERROR)
        }

        if (nextReleaseCents + nextRefundCents !== availableCents) {
                throw new BadRequestException(
                        'Tổng tiền release/refund phải bằng số tiền đang tranh chấp',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const messageUpdate = payload.message !== undefined ? payload.message.trim() : undefined
        const responseDeadline = new Date(Date.now() + FIVE_DAYS_IN_MS)

        const result = await prismaClient.$transaction(async tx => {
                const updatedNegotiation = await tx.disputeNegotiation.update({
                        where: { id: negotiationRecord.id },
                        data: {
                                releaseAmount: new Prisma.Decimal(centsToDecimalString(nextReleaseCents)),
                                refundAmount: new Prisma.Decimal(centsToDecimalString(nextRefundCents)),
                                ...(messageUpdate !== undefined ? { message: messageUpdate } : {})
                        }
                })

                const updatedDispute = await tx.dispute.update({
                        where: { id: disputeId },
                        data: {
                                latestProposalId: negotiationRecord.id,
                                proposedRelease: new Prisma.Decimal(centsToDecimalString(nextReleaseCents)),
                                proposedRefund: new Prisma.Decimal(centsToDecimalString(nextRefundCents)),
                                responseDeadline,
                                status: DisputeStatus.NEGOTIATION
                        },
                        include: { latestProposal: true }
                })

                return { negotiation: updatedNegotiation, dispute: updatedDispute }
        })

        await queueDisputeNegotiationEmail({
                action: 'updated',
                actorId: userId,
                recipientId: negotiationRecord.counterpartyId,
                dispute,
                releaseAmount: nextReleaseCents / 100,
                refundAmount: nextRefundCents / 100,
                message:
                        messageUpdate !== undefined
                                ? messageUpdate
                                : negotiationRecord.message ?? null
        })

        return {
                contractId,
                milestoneId,
                dispute: serializeDispute(result.dispute),
                negotiation: serializeDisputeNegotiation(result.negotiation)
        }
}

const deleteDisputeNegotiation = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string
) => {
        const context = await ensureDisputeContext(contractId, milestoneId, disputeId, userId)
        const { dispute } = context

        const negotiationRecord = await prismaClient.disputeNegotiation.findUnique({
                where: { id: negotiationId }
        })

        if (!negotiationRecord || negotiationRecord.disputeId !== disputeId) {
                throw new NotFoundException('Không tìm thấy đề xuất tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (negotiationRecord.proposerId !== userId) {
                throw new UnauthorizedException(
                        'Bạn không thể xóa đề xuất tranh chấp của người khác',
                        ErrorCode.USER_NOT_AUTHORITY
                )
        }

        if (negotiationRecord.status !== DisputeNegotiationStatus.PENDING) {
                throw new BadRequestException(
                        'Đề xuất đã được phản hồi, không thể xóa',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        if (dispute.latestProposalId !== negotiationId) {
                throw new BadRequestException(
                        'Chỉ có thể rút đề xuất đang chờ phản hồi',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const releaseCents = centsFromDecimal(negotiationRecord.releaseAmount)
        const refundCents = centsFromDecimal(negotiationRecord.refundAmount)
        const responseDeadline = new Date(Date.now() + FIVE_DAYS_IN_MS)

        const result = await prismaClient.$transaction(async tx => {
                const previousProposal = await tx.disputeNegotiation.findFirst({
                        where: {
                                disputeId,
                                id: { not: negotiationRecord.id }
                        },
                        orderBy: { createdAt: 'desc' }
                })

                const hasPendingPrevious = previousProposal?.status === DisputeNegotiationStatus.PENDING

                const updatedDispute = await tx.dispute.update({
                        where: { id: disputeId },
                        data: previousProposal
                                ? {
                                          latestProposalId: previousProposal.id,
                                          proposedRelease: previousProposal.releaseAmount,
                                          proposedRefund: previousProposal.refundAmount,
                                          responseDeadline: hasPendingPrevious ? responseDeadline : null,
                                          status: hasPendingPrevious ? DisputeStatus.NEGOTIATION : DisputeStatus.OPEN
                                  }
                                : {
                                          latestProposalId: null,
                                          proposedRelease: new Prisma.Decimal(0),
                                          proposedRefund: new Prisma.Decimal(0),
                                          responseDeadline: null,
                                          status: DisputeStatus.OPEN
                                  },
                        include: { latestProposal: true }
                })

                await tx.disputeNegotiation.delete({ where: { id: negotiationRecord.id } })

                return { dispute: updatedDispute, previousProposal }
        })

        await queueDisputeNegotiationEmail({
                action: 'deleted',
                actorId: userId,
                recipientId: negotiationRecord.counterpartyId,
                dispute,
                releaseAmount: releaseCents / 100,
                refundAmount: refundCents / 100,
                message: negotiationRecord.message ?? null
        })

        return {
                contractId,
                milestoneId,
                dispute: serializeDispute(result.dispute),
                removedNegotiationId: negotiationId
        }
}

const respondDisputeNegotiation = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string,
        payload: RespondDisputeNegotiationInput
) => {
        const context = await ensureDisputeContext(contractId, milestoneId, disputeId, userId)
        const { escrow, dispute } = context

        const negotiationRecord = await prismaClient.disputeNegotiation.findUnique({
                where: { id: negotiationId }
        })

        if (!negotiationRecord || negotiationRecord.disputeId !== disputeId) {
                throw new NotFoundException('Không tìm thấy đề xuất tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (negotiationRecord.counterpartyId !== userId) {
                throw new UnauthorizedException(
                        'Bạn không thể phản hồi đề xuất do chính mình gửi',
                        ErrorCode.USER_NOT_AUTHORITY
                )
        }

        if (negotiationRecord.status !== DisputeNegotiationStatus.PENDING) {
                throw new BadRequestException(
                        'Đề xuất đã được phản hồi trước đó',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        if (dispute.latestProposalId !== negotiationId) {
                throw new BadRequestException(
                        'Chỉ có thể phản hồi đề xuất mới nhất',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const releaseCents = centsFromDecimal(negotiationRecord.releaseAmount)
        const refundCents = centsFromDecimal(negotiationRecord.refundAmount)
        const message = payload.message?.trim() ?? null

        if (payload.action === 'accept') {
                const availableCents = computeDisputableCents(escrow)

                if (releaseCents + refundCents !== availableCents) {
                        throw new BadRequestException(
                                'Số tiền đề xuất không còn khớp với số tiền đang tranh chấp',
                                ErrorCode.PARAM_QUERY_ERROR
                        )
                }
        }

        const respondedAt = new Date()
        const result = await prismaClient.$transaction(async tx => {
                const updatedNegotiation = await tx.disputeNegotiation.update({
                        where: { id: negotiationRecord.id },
                        data: {
                                status:
                                        payload.action === 'accept'
                                                ? DisputeNegotiationStatus.ACCEPTED
                                                : DisputeNegotiationStatus.REJECTED,
                                respondedById: userId,
                                respondedAt,
                                responseMessage: message,
                        },
                })

                const updatedDispute =
                        payload.action === 'accept'
                                ? await tx.dispute.update({
                                          where: { id: disputeId },
                                          data: {
                                                  status:
                                                          refundCents === 0
                                                                  ? DisputeStatus.RESOLVED_RELEASE_ALL
                                                                  : releaseCents === 0
                                                                  ? DisputeStatus.RESOLVED_REFUND_ALL
                                                                  : DisputeStatus.RESOLVED_SPLIT,
                                                  latestProposalId: negotiationRecord.id,
                                                  proposedRelease: updatedNegotiation.releaseAmount,
                                                  proposedRefund: updatedNegotiation.refundAmount,
                                                  decidedRelease: updatedNegotiation.releaseAmount,
                                                  decidedRefund: updatedNegotiation.refundAmount,
                                                  decidedById: null,
                                                  responseDeadline: null,
                                          },
                                          include: { latestProposal: true },
                                  })
                                : await tx.dispute.update({
                                          where: { id: disputeId },
                                          data: {
                                                  status: DisputeStatus.OPEN,
                                                  latestProposalId: null,
                                                  proposedRelease: new Prisma.Decimal(0),
                                                  proposedRefund: new Prisma.Decimal(0),
                                                  decidedRelease: new Prisma.Decimal(0),
                                                  decidedRefund: new Prisma.Decimal(0),
                                                  decidedById: null,
                                                  responseDeadline: null,
                                          },
                                          include: { latestProposal: true },
                                  })

                return { dispute: updatedDispute, negotiation: updatedNegotiation }
        })

        const disputeForEmail: DisputeContextPayload = { ...context.dispute, ...result.dispute }

        await queueDisputeNegotiationEmail({
                action: payload.action === 'accept' ? 'accepted' : 'rejected',
                actorId: userId,
                recipientId: negotiationRecord.proposerId,
                dispute: disputeForEmail,
                releaseAmount: Number(result.negotiation.releaseAmount),
                refundAmount: Number(result.negotiation.refundAmount),
                message,
        })

        return {
                contractId,
                milestoneId,
                dispute: serializeDispute(result.dispute),
                negotiation: serializeDisputeNegotiation(result.negotiation),
        }
}

const confirmArbitrationFee = async (
        userId: string,
        contractId: string,
        milestoneId: string,
        disputeId: string,
        payload: ConfirmArbitrationFeeInput
) => {
        const context = await ensureDisputeContext(
                contractId,
                milestoneId,
                disputeId,
                userId,
                [DisputeStatus.AWAITING_ARBITRATION_FEES, DisputeStatus.ARBITRATION_READY]
        )
        const { dispute, contract } = context

        const isClient = contract.clientId === userId
        const isFreelancer = contract.freelancerId === userId

        if (!isClient && !isFreelancer) {
                throw new UnauthorizedException(
                        'Bạn không có quyền xác nhận phí trọng tài của tranh chấp này',
                        ErrorCode.USER_NOT_AUTHORITY
                )
        }

        if (isClient && dispute.clientArbFeePaid) {
                throw new BadRequestException(
                        'Bạn đã xác nhận đóng phí trọng tài trước đó',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        if (isFreelancer && dispute.freelancerArbFeePaid) {
                throw new BadRequestException(
                        'Bạn đã xác nhận đóng phí trọng tài trước đó',
                        ErrorCode.PARAM_QUERY_ERROR
                )
        }

        const escrow = dispute.escrow

        if (!escrow) {
                throw new NotFoundException('Không tìm thấy escrow của tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        const paymentMethod = await prismaClient.paymentMethodRef.findFirst({
                where: {
                        id: payload.paymentMethodRefId,
                        profileId: userId,
                        isDeleted: false
                }
        })

        if (!paymentMethod) {
                throw new NotFoundException('Không tìm thấy phương thức thanh toán', ErrorCode.ITEM_NOT_FOUND)
        }

        if (!paymentMethod.stripeCustomerId) {
                throw new BadRequestException('Phương thức thanh toán chưa được liên kết Stripe', ErrorCode.PARAM_QUERY_ERROR)
        }

        const stripe = getStripeClient()
        const stripeCurrency = escrow.currency.toLowerCase()
        const amountInMinorUnit = toMinorUnitAmount(dispute.arbFeePerParty, stripeCurrency)
        const idempotencyKey = payload.idempotencyKey?.trim()

        const fallbackCardFromPaymentMethod = {
                brand: paymentMethod.brand ?? null,
                last4: paymentMethod.last4 ?? null,
                expMonth: paymentMethod.expMonth ?? null,
                expYear: paymentMethod.expYear ?? null
        }

        let existingPayment: PaymentEntity | null = null

        if (idempotencyKey) {
                existingPayment = await prismaClient.payment.findFirst({
                        where: {
                                disputeId,
                                payerId: userId,
                                type: PaymentType.ARBITRATION_FEE,
                                OR: [{ idemKey: idempotencyKey }, { paymentIntentId: idempotencyKey }]
                        }
                })
        }

        const existingPaymentIntentId =
                existingPayment?.paymentIntentId ?? (idempotencyKey && idempotencyKey.startsWith('pi_') ? idempotencyKey : null)
        const payerRole = isClient ? Role.CLIENT : Role.FREELANCER

        let paymentRecord: PaymentEntity | null = null
        let paymentIntentStatus: Stripe.PaymentIntent.Status | null = null
        let requiresAction = false
        let nextAction: Stripe.PaymentIntent.NextAction | null = null
        let clientSecret: string | null = null
        let paymentIntentId: string | null = null
        let responseIdempotencyKey = idempotencyKey ?? existingPayment?.idemKey ?? null
        let resolvedDispute: DisputeDetailPayload | null = null

        const applyRequiresAction = async (
                paymentIntent: Stripe.PaymentIntent,
                options: { existingPayment?: PaymentEntity | null; idempotencyKey?: string | null }
        ) => {
                const pendingPayment = await prismaClient.payment.upsert({
                        where: { paymentIntentId: paymentIntent.id },
                        create: {
                                type: PaymentType.ARBITRATION_FEE,
                                amount: dispute.arbFeePerParty,
                                currency: escrow.currency,
                                status: PaymentStatus.REQUIRES_ACTION,
                                paymentIntentId: paymentIntent.id,
                                chargeId: null,
                                cardBrand: options.existingPayment?.cardBrand ?? fallbackCardFromPaymentMethod.brand,
                                cardLast4: options.existingPayment?.cardLast4 ?? fallbackCardFromPaymentMethod.last4,
                                cardExpMonth: options.existingPayment?.cardExpMonth ?? fallbackCardFromPaymentMethod.expMonth,
                                cardExpYear: options.existingPayment?.cardExpYear ?? fallbackCardFromPaymentMethod.expYear,
                                cardFingerprint: options.existingPayment?.cardFingerprint ?? null,
                                disputeId,
                                payerId: userId,
                                payerRole,
                                idemKey: options.idempotencyKey ?? null
                        },
                        update: {
                                status: PaymentStatus.REQUIRES_ACTION,
                                type: PaymentType.ARBITRATION_FEE,
                                disputeId,
                                payerId: userId,
                                payerRole,
                                ...(options.idempotencyKey ? { idemKey: options.idempotencyKey } : {})
                        }
                })

                paymentRecord = pendingPayment
                paymentIntentStatus = paymentIntent.status ?? null
                requiresAction = true
                nextAction = paymentIntent.next_action ?? null
                clientSecret = paymentIntent.client_secret ?? null
                paymentIntentId = paymentIntent.id
                responseIdempotencyKey = options.idempotencyKey ?? pendingPayment.idemKey ?? responseIdempotencyKey
        }

        const applySucceeded = async (
                paymentIntent: Stripe.PaymentIntent,
                options: { existingPayment?: PaymentEntity | null; idempotencyKey?: string | null }
        ) => {
                const latestCharge = paymentIntent.latest_charge
                let cardDetails: Stripe.Charge.PaymentMethodDetails.Card | null = null
                let chargeId: string | null = null

                if (latestCharge && typeof latestCharge !== 'string') {
                        const charge = latestCharge as Stripe.Charge
                        chargeId = charge.id ?? null
                        cardDetails = charge.payment_method_details?.card ?? null
                }

                const cardBrand = cardDetails?.brand ?? options.existingPayment?.cardBrand ?? fallbackCardFromPaymentMethod.brand
                const cardLast4 = cardDetails?.last4 ?? options.existingPayment?.cardLast4 ?? fallbackCardFromPaymentMethod.last4
                const cardExpMonth =
                        cardDetails?.exp_month ?? options.existingPayment?.cardExpMonth ?? fallbackCardFromPaymentMethod.expMonth
                const cardExpYear =
                        cardDetails?.exp_year ?? options.existingPayment?.cardExpYear ?? fallbackCardFromPaymentMethod.expYear
                const cardFingerprint = cardDetails?.fingerprint ?? options.existingPayment?.cardFingerprint ?? null

                const paymentResult = await prismaClient.$transaction(async tx => {
                        const disputeSnapshot = await tx.dispute.findUnique({
                                where: { id: disputeId },
                                select: {
                                        clientArbFeePaid: true,
                                        freelancerArbFeePaid: true
                                }
                        })

                        if (!disputeSnapshot) {
                                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
                        }

                        const updatedPayment = await tx.payment.upsert({
                                where: { paymentIntentId: paymentIntent.id },
                                create: {
                                        type: PaymentType.ARBITRATION_FEE,
                                        amount: dispute.arbFeePerParty,
                                        currency: escrow.currency,
                                        status: PaymentStatus.SUCCEEDED,
                                        paymentIntentId: paymentIntent.id,
                                        chargeId,
                                        cardBrand,
                                        cardLast4,
                                        cardExpMonth,
                                        cardExpYear,
                                        cardFingerprint,
                                        disputeId,
                                        payerId: userId,
                                        payerRole,
                                        idemKey: options.idempotencyKey ?? null
                                },
                                update: {
                                        status: PaymentStatus.SUCCEEDED,
                                        chargeId,
                                        cardBrand,
                                        cardLast4,
                                        cardExpMonth,
                                        cardExpYear,
                                        cardFingerprint,
                                        type: PaymentType.ARBITRATION_FEE,
                                        disputeId,
                                        payerId: userId,
                                        payerRole,
                                        ...(options.idempotencyKey ? { idemKey: options.idempotencyKey } : {})
                                }
                        })

                        const disputeUpdateData: Prisma.DisputeUpdateInput = {
                                responseDeadline: null
                        }

                        if (isClient) {
                                disputeUpdateData.clientArbFeePaid = true
                        } else {
                                disputeUpdateData.freelancerArbFeePaid = true
                        }

                        const clientPaid = isClient ? true : disputeSnapshot.clientArbFeePaid
                        const freelancerPaid = isFreelancer ? true : disputeSnapshot.freelancerArbFeePaid

                        if (clientPaid && freelancerPaid) {
                                disputeUpdateData.status = DisputeStatus.ARBITRATION_READY
                                disputeUpdateData.arbitrationDeadline = null
                        }

                        const updatedDispute = await tx.dispute.update({
                                where: { id: disputeId },
                                data: disputeUpdateData,
                                include: disputeDetailInclude
                        })

                        return { payment: updatedPayment, dispute: updatedDispute }
                })

                paymentRecord = paymentResult.payment
                resolvedDispute = paymentResult.dispute
                paymentIntentStatus = paymentIntent.status ?? null
                requiresAction = false
                nextAction = paymentIntent.next_action ?? null
                clientSecret = paymentIntent.client_secret ?? null
                paymentIntentId = paymentIntent.id
                responseIdempotencyKey =
                        options.idempotencyKey ?? paymentResult.payment.idemKey ?? responseIdempotencyKey
        }

        try {
                const effectiveIdempotencyKey = idempotencyKey ?? existingPayment?.idemKey ?? null

                if (existingPaymentIntentId) {
                        const retrievedIntent = await stripe.paymentIntents.retrieve(existingPaymentIntentId, {
                                expand: ['latest_charge.payment_method_details.card']
                        })

                        if (
                                retrievedIntent.status === 'succeeded' ||
                                retrievedIntent.status === 'processing' ||
                                retrievedIntent.status === 'requires_capture'
                        ) {
                                await applySucceeded(retrievedIntent, {
                                        existingPayment,
                                        idempotencyKey: effectiveIdempotencyKey
                                })
                        } else if (
                                retrievedIntent.status === 'requires_action' ||
                                retrievedIntent.status === 'requires_confirmation'
                        ) {
                                await applyRequiresAction(retrievedIntent, {
                                        existingPayment,
                                        idempotencyKey: effectiveIdempotencyKey
                                })
                        } else if (retrievedIntent.status === 'requires_payment_method') {
                                const lastErrorCode = retrievedIntent.last_payment_error?.code
                                const requiresAuthentication = lastErrorCode === 'authentication_required'

                                if (requiresAuthentication) {
                                        await applyRequiresAction(retrievedIntent, {
                                                existingPayment,
                                                idempotencyKey:
                                                        effectiveIdempotencyKey ??
                                                        existingPayment?.paymentIntentId ??
                                                        retrievedIntent.id
                                        })
                                } else {
                                        if (existingPayment && existingPayment.status !== PaymentStatus.FAILED) {
                                                await prismaClient.payment.update({
                                                        where: { id: existingPayment.id },
                                                        data: { status: PaymentStatus.FAILED }
                                                })
                                        }

                                        throw new BadRequestException(
                                                'Thanh toán cần một phương thức khác. Vui lòng thử lại với thẻ khác.',
                                                ErrorCode.PARAM_QUERY_ERROR
                                        )
                                }
                        }

                        if (paymentRecord) {
                                const ensuredPayment = paymentRecord!
                                const serializedPayment = serializePayment(ensuredPayment)
                                const disputeRecord =
                                        resolvedDispute ??
                                        (await prismaClient.dispute.findUnique({
                                                where: { id: disputeId },
                                                include: disputeDetailInclude
                                        }))

                                if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone) {
                                        throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
                                }

                                const metaPayload = {
                                        status: paymentIntentStatus,
                                        paymentStatus: serializedPayment.status,
                                        requiresAction,
                                        clientSecret,
                                        client_secret: clientSecret,
                                        idempotencyKey: responseIdempotencyKey,
                                        idemKey: responseIdempotencyKey,
                                        paymentIntentId,
                                        payment_intent_id: paymentIntentId
                                }

                                return {
                                        contractId,
                                        milestoneId,
                                        dispute: serializeDispute(disputeRecord),
                                        negotiations: disputeRecord.negotiations.map(serializeDisputeNegotiation),
                                        payment: serializedPayment,
                                        nextAction,
                                        ...metaPayload
                                }
                        }
                }

                const requireThreeDS = Boolean(STRIPE_CONFIG_INFO.FORCE_3DS)
                const paymentIntent = await stripe.paymentIntents.create(
                        {
                                amount: amountInMinorUnit,
                                currency: stripeCurrency,
                                customer: paymentMethod.stripeCustomerId,
                                payment_method: paymentMethod.paymentMethodId,
                                confirm: true,
                                off_session: true,
                                description: `Arbitration fee for dispute ${dispute.id}`,
                                metadata: {
                                        contractId,
                                        milestoneId,
                                        disputeId,
                                        payerId: userId,
                                        payerRole,
                                        paymentMethodRefId: paymentMethod.id
                                },
                                expand: ['latest_charge.payment_method_details.card'],
                                payment_method_options: {
                                        card: {
                                                request_three_d_secure: requireThreeDS ? 'any' : 'automatic'
                                        }
                                }
                        },
                        idempotencyKey ? { idempotencyKey } : undefined
                )

                await applySucceeded(paymentIntent, {
                        idempotencyKey: idempotencyKey ?? null
                })
        } catch (error) {
                if (error instanceof Stripe.errors.StripeCardError) {
                        const paymentIntent = error.payment_intent as Stripe.PaymentIntent | undefined
                        const paymentIntentStatus = paymentIntent?.status
                        const lastErrorCode =
                                paymentIntent?.last_payment_error?.code ?? (typeof error.code === 'string' ? error.code : undefined)
                        const effectiveIdempotencyKey = idempotencyKey ?? existingPayment?.idemKey ?? null

                        if (
                                paymentIntent &&
                                (paymentIntentStatus === 'requires_action' || paymentIntentStatus === 'requires_confirmation')
                        ) {
                                await applyRequiresAction(paymentIntent, {
                                        existingPayment,
                                        idempotencyKey: effectiveIdempotencyKey
                                })
                        } else if (
                                paymentIntent &&
                                paymentIntentStatus === 'requires_payment_method' &&
                                lastErrorCode === 'authentication_required'
                        ) {
                                await applyRequiresAction(paymentIntent, {
                                        existingPayment,
                                        idempotencyKey:
                                                effectiveIdempotencyKey ?? existingPayment?.paymentIntentId ?? paymentIntent.id
                                })
                        } else {
                                throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
                        }
                } else if (error instanceof Stripe.errors.StripeError) {
                        throw new BadRequestException(error.message, ErrorCode.PARAM_QUERY_ERROR)
                } else {
                        throw error
                }
        }

        const disputeRecord =
                resolvedDispute ??
                (await prismaClient.dispute.findUnique({
                        where: { id: disputeId },
                        include: disputeDetailInclude
                }))

        if (!disputeRecord || !disputeRecord.escrow || !disputeRecord.escrow.milestone) {
                throw new NotFoundException('Không tìm thấy tranh chấp', ErrorCode.ITEM_NOT_FOUND)
        }

        if (!paymentRecord) {
                throw new InternalServerException(
                        'Không thể ghi nhận giao dịch phí trọng tài',
                        ErrorCode.INTERNAL_SERVER_ERROR
                )
        }

        const ensuredPayment = paymentRecord!
        const serializedPayment = serializePayment(ensuredPayment)
        const metaPayload = {
                status: paymentIntentStatus,
                paymentStatus: serializedPayment.status,
                requiresAction,
                clientSecret,
                client_secret: clientSecret,
                idempotencyKey: responseIdempotencyKey,
                idemKey: responseIdempotencyKey,
                paymentIntentId,
                payment_intent_id: paymentIntentId
        }

        return {
                contractId,
                milestoneId,
                dispute: serializeDispute(disputeRecord),
                negotiations: disputeRecord.negotiations.map(serializeDisputeNegotiation),
                payment: serializedPayment,
                nextAction,
                ...metaPayload
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

	const fallbackCardFromPaymentMethod = {
		brand: paymentMethod.brand ?? null,
		last4: paymentMethod.last4 ?? null,
		expMonth: paymentMethod.expMonth ?? null,
		expYear: paymentMethod.expYear ?? null
	}

	let existingPayment: PaymentEntity | null = null

	if (idempotencyKey) {
		existingPayment = await prismaClient.payment.findFirst({
			where: {
				escrowId: escrow.id,
				OR: [{ idemKey: idempotencyKey }, { paymentIntentId: idempotencyKey }]
			}
		})
	}

	const existingPaymentIntentId =
		existingPayment?.paymentIntentId ?? (idempotencyKey && idempotencyKey.startsWith('pi_') ? idempotencyKey : null)

	const buildRequiresActionResponse = async (
		paymentIntent: Stripe.PaymentIntent,
		options: {
			existingPayment?: PaymentEntity | null
			idempotencyKey?: string | null
		}
	) => {
		const pendingPayment = await prismaClient.payment.upsert({
			where: { paymentIntentId: paymentIntent.id },
			create: {
				escrowId: escrow.id,
				amount: milestoneRecord.amount,
				currency: milestoneRecord.currency,
				status: PaymentStatus.REQUIRES_ACTION,
				paymentIntentId: paymentIntent.id,
				chargeId: null,
				cardBrand: options.existingPayment?.cardBrand ?? fallbackCardFromPaymentMethod.brand,
				cardLast4: options.existingPayment?.cardLast4 ?? fallbackCardFromPaymentMethod.last4,
				cardExpMonth: options.existingPayment?.cardExpMonth ?? fallbackCardFromPaymentMethod.expMonth,
				cardExpYear: options.existingPayment?.cardExpYear ?? fallbackCardFromPaymentMethod.expYear,
				cardFingerprint: options.existingPayment?.cardFingerprint ?? null,
				idemKey: options.idempotencyKey ?? null
			},
			update: {
				status: PaymentStatus.REQUIRES_ACTION,
				...(options.idempotencyKey ? { idemKey: options.idempotencyKey } : {})
			}
		})

		const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

		const metaPayload = {
			status: paymentIntent.status ?? null,
			paymentStatus: pendingPayment.status,
			requiresAction: true,
			clientSecret: paymentIntent.client_secret ?? null,
			client_secret: paymentIntent.client_secret ?? null,
			idempotencyKey: options.idempotencyKey ?? pendingPayment.idemKey ?? null,
			idemKey: pendingPayment.idemKey ?? options.idempotencyKey ?? null,
			paymentIntentId: paymentIntent.id,
			payment_intent_id: paymentIntent.id
		}

		return {
			contractId,
			milestone: serializeMilestone(updatedMilestone),
			payment: serializePayment(pendingPayment),
			nextAction: paymentIntent.next_action ?? null,
			...metaPayload
		}
	}

	const buildSucceededResponse = async (
		paymentIntent: Stripe.PaymentIntent,
		options: {
			existingPayment?: PaymentEntity | null
			idempotencyKey?: string | null
		}
	) => {
		const latestCharge = paymentIntent.latest_charge
		let cardDetails: Stripe.Charge.PaymentMethodDetails.Card | null = null
		let chargeId: string | null = null

		if (latestCharge && typeof latestCharge !== 'string') {
			const charge = latestCharge as Stripe.Charge
			chargeId = charge.id ?? null
			cardDetails = charge.payment_method_details?.card ?? null
		}

		const cardBrand = cardDetails?.brand ?? options.existingPayment?.cardBrand ?? fallbackCardFromPaymentMethod.brand
		const cardLast4 = cardDetails?.last4 ?? options.existingPayment?.cardLast4 ?? fallbackCardFromPaymentMethod.last4
		const cardExpMonth =
			cardDetails?.exp_month ?? options.existingPayment?.cardExpMonth ?? fallbackCardFromPaymentMethod.expMonth
		const cardExpYear =
			cardDetails?.exp_year ?? options.existingPayment?.cardExpYear ?? fallbackCardFromPaymentMethod.expYear
		const cardFingerprint = cardDetails?.fingerprint ?? options.existingPayment?.cardFingerprint ?? null

		const paymentRecord = await prismaClient.$transaction(async tx => {
			const updatedPayment = await tx.payment.upsert({
				where: { paymentIntentId: paymentIntent.id },
				create: {
					escrowId: escrow.id,
					amount: milestoneRecord.amount,
					currency: milestoneRecord.currency,
					status: PaymentStatus.SUCCEEDED,
					paymentIntentId: paymentIntent.id,
					chargeId,
					cardBrand,
					cardLast4,
					cardExpMonth,
					cardExpYear,
					cardFingerprint,
					idemKey: options.idempotencyKey ?? null
				},
				update: {
					status: PaymentStatus.SUCCEEDED,
					chargeId,
					cardBrand,
					cardLast4,
					cardExpMonth,
					cardExpYear,
					cardFingerprint,
					...(options.idempotencyKey ? { idemKey: options.idempotencyKey } : {})
				}
			})

			if (!options.existingPayment || options.existingPayment.status !== PaymentStatus.SUCCEEDED) {
				await tx.escrow.update({
					where: { id: escrow.id },
					data: {
						amountFunded: escrow.amountFunded.plus(milestoneRecord.amount),
						status: EscrowStatus.FUNDED
					}
				})
			}

			return updatedPayment
		})

		const updatedMilestone = await loadMilestoneWithDetails(milestoneId)

		const responseMeta = {
			status: paymentIntent.status ?? null,
			paymentStatus: paymentRecord.status,
			requiresAction: false,
			clientSecret: paymentIntent.client_secret ?? null,
			client_secret: paymentIntent.client_secret ?? null,
			idempotencyKey: options.idempotencyKey ?? paymentRecord.idemKey ?? null,
			idemKey: paymentRecord.idemKey ?? options.idempotencyKey ?? null,
			paymentIntentId: paymentIntent.id,
			payment_intent_id: paymentIntent.id
		}

		return {
			contractId,
			milestone: serializeMilestone(updatedMilestone),
			payment: serializePayment(paymentRecord),
			nextAction: paymentIntent.next_action ?? null,
			...responseMeta
		}
	}

	try {
		const effectiveIdempotencyKey = idempotencyKey ?? existingPayment?.idemKey ?? null

		if (existingPaymentIntentId) {
			const retrievedIntent = await stripe.paymentIntents.retrieve(existingPaymentIntentId, {
				expand: ['latest_charge.payment_method_details.card']
			})

			if (
				retrievedIntent.status === 'succeeded' ||
				retrievedIntent.status === 'processing' ||
				retrievedIntent.status === 'requires_capture'
			) {
				return buildSucceededResponse(retrievedIntent, {
					existingPayment,
					idempotencyKey: effectiveIdempotencyKey
				})
			}

			if (retrievedIntent.status === 'requires_action' || retrievedIntent.status === 'requires_confirmation') {
				return buildRequiresActionResponse(retrievedIntent, {
					existingPayment,
					idempotencyKey: effectiveIdempotencyKey
				})
			}

			if (retrievedIntent.status === 'requires_payment_method') {
				const lastErrorCode = retrievedIntent.last_payment_error?.code
				const requiresAuthentication = lastErrorCode === 'authentication_required'

				if (requiresAuthentication) {
					return buildRequiresActionResponse(retrievedIntent, {
						existingPayment,
						idempotencyKey: effectiveIdempotencyKey ?? existingPayment?.paymentIntentId ?? retrievedIntent.id
					})
				}

				if (existingPayment && existingPayment.status !== PaymentStatus.FAILED) {
					await prismaClient.payment.update({
						where: { id: existingPayment.id },
						data: { status: PaymentStatus.FAILED }
					})
				}

				throw new BadRequestException(
					'Thanh toán cần một phương thức khác. Vui lòng thử lại với thẻ khác.',
					ErrorCode.PARAM_QUERY_ERROR
				)
			}
		}

		const requireThreeDS = Boolean(STRIPE_CONFIG_INFO.FORCE_3DS)
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
				expand: ['latest_charge.payment_method_details.card'],
				payment_method_options: {
					card: {
						request_three_d_secure: requireThreeDS ? 'any' : 'automatic'
					}
				}
			},
			idempotencyKey ? { idempotencyKey } : undefined
		)

		return buildSucceededResponse(paymentIntent, {
			idempotencyKey: idempotencyKey ?? null
		})
	} catch (error) {
		if (error instanceof Stripe.errors.StripeCardError) {
			const paymentIntent = error.payment_intent as Stripe.PaymentIntent | undefined
			const paymentIntentStatus = paymentIntent?.status
			const lastErrorCode =
				paymentIntent?.last_payment_error?.code ?? (typeof error.code === 'string' ? error.code : undefined)
			const effectiveIdempotencyKey = idempotencyKey ?? existingPayment?.idemKey ?? null

			if (
				paymentIntent &&
				(paymentIntentStatus === 'requires_action' || paymentIntentStatus === 'requires_confirmation')
			) {
				return buildRequiresActionResponse(paymentIntent, {
					existingPayment,
					idempotencyKey: effectiveIdempotencyKey
				})
			}

			if (
				paymentIntent &&
				paymentIntentStatus === 'requires_payment_method' &&
				lastErrorCode === 'authentication_required'
			) {
				return buildRequiresActionResponse(paymentIntent, {
					existingPayment,
					idempotencyKey: effectiveIdempotencyKey ?? existingPayment?.paymentIntentId ?? paymentIntent.id
				})
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
	const contract = await ensureContractBelongsToFreelancer(contractId, freelancerUserId)

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

                await notifyMilestoneParticipants(
                        contract,
                        freelancerUserId,
                        {
                                event: NotificationEvent.CONTRACT_MILESTONE_SUBMITTED,
                                resourceType: NotificationResource.MILESTONE_SUBMISSION,
                                resourceId: submissionRecord.id,
                                payload: {
                                        contractId,
                                        milestoneId,
                                        submissionId: submissionRecord.id
                                }
                        },
                        'Không thể tạo thông báo khi freelancer gửi kết quả milestone'
                )

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
	const contract = await ensureContractBelongsToClient(contractId, clientUserId)

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

        await notifyMilestoneParticipants(
                contract,
                clientUserId,
                {
                        event: NotificationEvent.CONTRACT_MILESTONE_APPROVED,
                        resourceType: NotificationResource.MILESTONE_SUBMISSION,
                        resourceId: submission.id,
                        payload: {
                                contractId,
                                milestoneId,
                                submissionId: submission.id,
                                action: 'approved'
                        }
                },
                'Không thể tạo thông báo khi client duyệt kết quả milestone'
        )

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
	const contract = await ensureContractBelongsToClient(contractId, clientUserId)

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

        await notifyMilestoneParticipants(
                contract,
                clientUserId,
                {
                        event: NotificationEvent.CONTRACT_MILESTONE_DECLINED,
                        resourceType: NotificationResource.MILESTONE_SUBMISSION,
                        resourceId: declinedSubmission.id,
                        payload: {
                                contractId,
                                milestoneId,
                                submissionId: declinedSubmission.id,
                                action: 'declined'
                        }
                },
                'Không thể tạo thông báo khi client từ chối kết quả milestone'
        )

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
        listContractDisputes,
        getMilestoneDispute,
        createContractMilestone,
        uploadMilestoneResources,
        deleteMilestoneResource,
        deleteContractMilestone,
        cancelMilestone,
        respondMilestoneCancellation,
        openMilestoneDispute,
        createDisputeNegotiation,
        updateDisputeNegotiation,
        respondDisputeNegotiation,
        deleteDisputeNegotiation,
        confirmArbitrationFee,
        payMilestone,
        submitMilestoneWork,
        approveMilestoneSubmission,
        declineMilestoneSubmission
}

export default contractService
