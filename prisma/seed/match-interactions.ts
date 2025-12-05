import { MatchInteractionSource, MatchInteractionType, Prisma, Role } from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

type InteractionSeed = {
	jobTitle?: string
	jobClientEmail?: string
	freelancerEmail?: string
	clientEmail?: string
	actorEmail: string
	actorRole?: Role
	type: MatchInteractionType
	source?: MatchInteractionSource
	occurredAt: Date
	metadata?: Prisma.InputJsonValue
}

const MATCH_INTERACTIONS: InteractionSeed[] = [
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'amira.nguyen@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'amira.nguyen@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.JOB_VIEW,
		source: MatchInteractionSource.SEARCH,
		occurredAt: new Date('2024-05-02T03:10:00.000Z'),
		metadata: { device: 'mobile', location: 'HCMC' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'amira.nguyen@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'amira.nguyen@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.PROPOSAL_SUBMITTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-05-02T03:45:00.000Z'),
		metadata: { rate: 75, currency: 'USD', coverLetterPreview: 'Outlined onboarding audit + KYC integrations' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'amira.nguyen@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'linh.tran@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROFILE_VIEW,
		source: MatchInteractionSource.RECOMMENDATION,
		occurredAt: new Date('2024-05-03T08:05:00.000Z'),
		metadata: { sourceJobId: 'fintech-onboarding', viewContext: 'proposal_review' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'amira.nguyen@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'linh.tran@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROPOSAL_SHORTLISTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-05-03T08:20:00.000Z'),
		metadata: { note: 'Strong AML experience + bilingual' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'aditya.raj@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'aditya.raj@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.JOB_VIEW,
		source: MatchInteractionSource.SEARCH,
		occurredAt: new Date('2024-05-04T02:10:00.000Z'),
		metadata: { device: 'desktop', location: 'Bengaluru' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'aditya.raj@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'aditya.raj@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.PROPOSAL_SUBMITTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-05-04T02:40:00.000Z'),
		metadata: { rate: 85, currency: 'USD', coverLetterPreview: 'Terraform + SOC2 guardrails plan' }
	},
	{
		jobTitle: 'Build B2B fintech account onboarding platform',
		jobClientEmail: 'linh.tran@client.test',
		freelancerEmail: 'aditya.raj@freelancer.test',
		clientEmail: 'linh.tran@client.test',
		actorEmail: 'linh.tran@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROPOSAL_INTERVIEWING,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-05-06T01:00:00.000Z'),
		metadata: { channel: 'Zoom', timezone: 'GMT+7', interviewSlot: '2024-05-08T03:00:00.000Z' }
	},
	{
		jobTitle: 'Realtime clickstream and attribution warehouse',
		jobClientEmail: 'sylvia.chen@client.test',
		freelancerEmail: 'elena.garcia@freelancer.test',
		clientEmail: 'sylvia.chen@client.test',
		actorEmail: 'elena.garcia@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.JOB_VIEW,
		source: MatchInteractionSource.RECOMMENDATION,
		occurredAt: new Date('2024-04-15T14:25:00.000Z'),
		metadata: { source: 'data-matching', viewedFrom: 'job_digest_email' }
	},
	{
		jobTitle: 'Realtime clickstream and attribution warehouse',
		jobClientEmail: 'sylvia.chen@client.test',
		freelancerEmail: 'elena.garcia@freelancer.test',
		clientEmail: 'sylvia.chen@client.test',
		actorEmail: 'elena.garcia@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.PROPOSAL_SUBMITTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-04-15T15:00:00.000Z'),
		metadata: {
			rate: 95,
			currency: 'USD',
			availability: '30h/week',
			coverLetterPreview: 'Can ingest ads + CRM via CDC and dbt'
		}
	},
	{
		jobTitle: 'Realtime clickstream and attribution warehouse',
		jobClientEmail: 'sylvia.chen@client.test',
		freelancerEmail: 'elena.garcia@freelancer.test',
		clientEmail: 'sylvia.chen@client.test',
		actorEmail: 'sylvia.chen@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROPOSAL_SHORTLISTED,
		source: MatchInteractionSource.SEARCH,
		occurredAt: new Date('2024-04-16T04:15:00.000Z'),
		metadata: { note: 'Has warehouse-first mindset + BQ experience' }
	},
	{
		jobTitle: 'Realtime clickstream and attribution warehouse',
		jobClientEmail: 'sylvia.chen@client.test',
		freelancerEmail: 'liam.brown@freelancer.test',
		clientEmail: 'sylvia.chen@client.test',
		actorEmail: 'sylvia.chen@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.INVITATION_SENT,
		source: MatchInteractionSource.RECOMMENDATION,
		occurredAt: new Date('2024-04-16T05:30:00.000Z'),
		metadata: { message: 'Interested in your CDP experience for our clickstream stack' }
	},
	{
		jobTitle: 'Realtime clickstream and attribution warehouse',
		jobClientEmail: 'sylvia.chen@client.test',
		freelancerEmail: 'liam.brown@freelancer.test',
		clientEmail: 'sylvia.chen@client.test',
		actorEmail: 'liam.brown@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.INVITATION_ACCEPTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-04-16T09:00:00.000Z'),
		metadata: { response: 'Happy to chat; have Looker + dbt portfolio ready' }
	},
	{
		jobTitle: 'Mobile banking onboarding and card activation UX',
		jobClientEmail: 'maria.rossi@client.test',
		freelancerEmail: 'kaito.ito@freelancer.test',
		clientEmail: 'maria.rossi@client.test',
		actorEmail: 'kaito.ito@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.JOB_VIEW,
		source: MatchInteractionSource.SEARCH,
		occurredAt: new Date('2024-03-24T09:40:00.000Z'),
		metadata: { browser: 'Chrome', locale: 'ja-JP' }
	},
	{
		jobTitle: 'Mobile banking onboarding and card activation UX',
		jobClientEmail: 'maria.rossi@client.test',
		freelancerEmail: 'kaito.ito@freelancer.test',
		clientEmail: 'maria.rossi@client.test',
		actorEmail: 'kaito.ito@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.PROPOSAL_SUBMITTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-03-24T10:20:00.000Z'),
		metadata: { coverLetterPreview: 'WCAG AA flow + microcopy ideas', availability: '20h/week' }
	},
	{
		jobTitle: 'Mobile banking onboarding and card activation UX',
		jobClientEmail: 'maria.rossi@client.test',
		freelancerEmail: 'kaito.ito@freelancer.test',
		clientEmail: 'maria.rossi@client.test',
		actorEmail: 'maria.rossi@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROPOSAL_INTERVIEWING,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-03-26T07:00:00.000Z'),
		metadata: { interviewSlot: '2024-03-27T14:00:00.000Z', notes: 'Bring Figma files with card activation flow' }
	},
	{
		jobTitle: 'Mobile banking onboarding and card activation UX',
		jobClientEmail: 'maria.rossi@client.test',
		freelancerEmail: 'kaito.ito@freelancer.test',
		clientEmail: 'maria.rossi@client.test',
		actorEmail: 'maria.rossi@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.OFFER_SENT,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-03-28T08:15:00.000Z'),
		metadata: { contractLengthWeeks: 8, paymentMode: 'fixed_single' }
	},
	{
		jobTitle: 'Mobile banking onboarding and card activation UX',
		jobClientEmail: 'maria.rossi@client.test',
		freelancerEmail: 'kaito.ito@freelancer.test',
		clientEmail: 'maria.rossi@client.test',
		actorEmail: 'kaito.ito@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.OFFER_ACCEPTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-03-28T10:00:00.000Z'),
		metadata: { acceptedRate: 9200, currency: 'USD', kickoffDate: '2024-04-02' }
	},
	{
		jobTitle: 'Green architecture microsite with 3D landing page',
		jobClientEmail: 'diep.le@client.test',
		freelancerEmail: 'sofia.lima@freelancer.test',
		clientEmail: 'diep.le@client.test',
		actorEmail: 'diep.le@client.test',
		actorRole: Role.CLIENT,
		type: MatchInteractionType.PROFILE_VIEW,
		source: MatchInteractionSource.SEARCH,
		occurredAt: new Date('2024-02-10T03:30:00.000Z'),
		metadata: { reason: 'Shortlisted for mobile hero animation' }
	},
	{
		jobTitle: 'Green architecture microsite with 3D landing page',
		jobClientEmail: 'diep.le@client.test',
		freelancerEmail: 'sofia.lima@freelancer.test',
		clientEmail: 'diep.le@client.test',
		actorEmail: 'sofia.lima@freelancer.test',
		actorRole: Role.FREELANCER,
		type: MatchInteractionType.INVITATION_ACCEPTED,
		source: MatchInteractionSource.DIRECT,
		occurredAt: new Date('2024-02-12T11:10:00.000Z'),
		metadata: { message: 'Available to prototype Flutter Web hero animations' }
	}
]

export async function seedMatchInteractions() {
	return runStep('Match interactions', async () => {
		const relevantEmails = Array.from(
			new Set(
				MATCH_INTERACTIONS.flatMap(seed => [
					seed.actorEmail,
					seed.clientEmail,
					seed.freelancerEmail,
					seed.jobClientEmail
				]).filter(Boolean) as string[]
			)
		)

		const users = await prisma.user.findMany({
			where: { email: { in: relevantEmails } },
			select: { id: true, email: true, role: true }
		})
		const userByEmail = new Map(users.map(u => [u.email, u]))

		const actorIds = new Set<string>()
		const jobIds = new Set<string>()
		const interactionsToInsert: Prisma.MatchInteractionCreateManyInput[] = []

		for (const seed of MATCH_INTERACTIONS) {
			const actor = userByEmail.get(seed.actorEmail)
			if (!actor) {
				console.warn(`⚠ Skip interaction ${seed.type} because actor ${seed.actorEmail} not found`)
				continue
			}

			const freelancerId: string | null = seed.freelancerEmail
				? userByEmail.get(seed.freelancerEmail)?.id ?? null
				: null
			const clientId: string | null = seed.clientEmail ? userByEmail.get(seed.clientEmail)?.id ?? null : null
			const jobClientId: string | null = seed.jobClientEmail ? userByEmail.get(seed.jobClientEmail)?.id ?? null : null

			let jobId: string | null = null
			if (seed.jobTitle) {
				const job = await prisma.jobPost.findFirst({
					where: {
						title: seed.jobTitle,
						...(jobClientId ? { clientId: jobClientId } : {})
					},
					select: { id: true }
				})

				if (!job) {
					console.warn(
						`⚠ Skip interaction ${seed.type} because job '${seed.jobTitle}' for client ${seed.jobClientEmail} not found`
					)
					jobId = null
					continue
				}
				jobId = job.id
				jobIds.add(job.id)
			}

			actorIds.add(actor.id)

			interactionsToInsert.push({
				jobId,
				freelancerId,
				clientId,
				actorProfileId: actor.id,
				actorRole: seed.actorRole ?? actor.role ?? null,
				type: seed.type,
				source: seed.source ?? MatchInteractionSource.DIRECT,
				occurredAt: seed.occurredAt,
				metadata: seed.metadata ?? Prisma.JsonNull
			})
		}

		if (!interactionsToInsert.length) {
			console.log('No match interactions to insert')
			return
		}

		await prisma.matchInteraction.deleteMany({
			where: {
				OR: [{ actorProfileId: { in: Array.from(actorIds) } }, { jobId: { in: Array.from(jobIds) } }]
			}
		})

		await prisma.matchInteraction.createMany({ data: interactionsToInsert })
		console.log(`✔ Inserted ${interactionsToInsert.length} match interactions`)
	})
}
