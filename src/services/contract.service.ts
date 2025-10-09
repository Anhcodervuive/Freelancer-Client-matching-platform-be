import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Express } from 'express'

import { AssetKind, AssetProvider, AssetStatus, Prisma } from '~/generated/prisma'

import { prismaClient } from '~/config/prisma-client'
import { R2_CONFIG } from '~/config/environment'
import { BadRequestException } from '~/exceptions/bad-request'
import { NotFoundException } from '~/exceptions/not-found'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import { ContractListFilterInput, CreateContractMilestoneInput } from '~/schema/contract.schema'
import { deleteR2Object, uploadBufferToR2 } from '~/providers/r2.provider'

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
        }
})

type ContractSummaryPayload = Prisma.ContractGetPayload<{ include: typeof contractSummaryInclude }>
type ContractDetailPayload = Prisma.ContractGetPayload<{ include: typeof contractDetailInclude }>
type MilestonePayload = Prisma.MilestoneGetPayload<{ include: typeof milestoneInclude }>
type MilestoneResourcePayload = Prisma.MilestoneResourceGetPayload<{ include: typeof milestoneResourceInclude }>
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
                        : null
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

        const tasks = uploads.map(item =>
                deleteR2Object(item.object.bucket, item.object.key).catch(() => undefined)
        )

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

const serializeMilestone = (milestone: MilestonePayload) => {
        return {
                id: milestone.id,
                contractId: milestone.contractId,
                title: milestone.title,
                amount: Number(milestone.amount),
                currency: milestone.currency,
                status: milestone.status,
                updatedAt: milestone.updatedAt,
                resources: milestone.resources.map(resource => serializeMilestoneResource(resource)),
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
                throw new BadRequestException(
                        'Bạn cần tải lên ít nhất một file tài nguyên',
                        ErrorCode.PARAM_QUERY_ERROR
                )
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

const contractService = {
        listContracts,
        getContractDetail,
        listContractMilestones,
        listMilestoneResources,
        createContractMilestone,
        uploadMilestoneResources,
        deleteMilestoneResource
}

export default contractService
