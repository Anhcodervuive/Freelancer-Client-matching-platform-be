import {
  ChatMessageType,
  ChatThreadType,
  ContractSignatureProvider,
  ContractSignatureStatus,
  ContractStatus,
  ContractClosureType,
  JobOfferStatus,
  JobOfferType,
  JobProposalStatus,
  MatchInteractionSource,
  MatchInteractionType,
  Prisma,
  Role
} from '../../src/generated/prisma'
import { prisma, runStep } from './_utils'

type Scenario = {
  key: string
  jobTitle: string
  freelancerEmail: string
  clientEmail: string
  proposal: {
    coverLetter: string
    bidAmount: number
    bidCurrency: string
    submittedAt: string
    status?: JobProposalStatus
  }
  offer: {
    title: string
    message: string
    type: JobOfferType
    currency: string
    fixedPrice: number
    startDate: string
    endDate: string
    expireAt: string
    status: JobOfferStatus
    sentAt: string
    respondedAt: string
    isDeleted?: boolean
    deletedAt?: string
  }
  contract: {
    title: string
    currency: string
    status: ContractStatus
    signatureStatus: ContractSignatureStatus
    signatureCompletedAt: string
    signatureProvider?: ContractSignatureProvider
    termsAcceptedAt?: string
    clientAcceptedAt?: string
    closureType?: ContractClosureType | null
    endedAt?: string | null
  }
  chat: {
    subject?: string
    participantsJoinedAt: { client: string; freelancer: string }
    messages: {
      sender: 'client' | 'freelancer'
      sentAt: string
      body: string
      metadata?: Record<string, unknown>
    }[]
    lastReadAt: string
  }
  interactions: {
    type: MatchInteractionType
    source: MatchInteractionSource
    occurredAt: string
    metadata?: Record<string, unknown>
    actor: 'client' | 'freelancer'
  }[]
}

type ParticipantSet = {
  client: { id: string; role: Role }
  freelancer: { id: string; role: Role }
  job: { id: string; clientId: string; title: string }
}

async function resolveParticipants(scenario: Scenario): Promise<ParticipantSet | null> {
  const freelancer = await prisma.user.findUnique({
    where: { email: scenario.freelancerEmail },
    select: { id: true, role: true }
  })

  const client = await prisma.user.findUnique({
    where: { email: scenario.clientEmail },
    select: { id: true, role: true }
  })

  const job = await prisma.jobPost.findFirst({
    where: { title: scenario.jobTitle, isDeleted: false },
    select: { id: true, clientId: true, title: true }
  })

  if (!freelancer || freelancer.role !== Role.FREELANCER) {
    console.warn(`⚠ Cannot seed interactions for ${scenario.key}: freelancer ${scenario.freelancerEmail} not found or role mismatch`)
    return null
  }

  if (!client || client.role !== Role.CLIENT) {
    console.warn(`⚠ Cannot seed interactions for ${scenario.key}: client ${scenario.clientEmail} not found or role mismatch`)
    return null
  }

  if (!job) {
    console.warn(`⚠ Cannot seed interactions for ${scenario.key}: job "${scenario.jobTitle}" not found`)
    return null
  }

  if (job.clientId !== client.id) {
    console.warn(`⚠ Cannot seed interactions for ${scenario.key}: job is not owned by expected client ${scenario.clientEmail}`)
    return null
  }

  return { client, freelancer, job }
}

async function ensureProposal(jobId: string, freelancerId: string, scenario: Scenario) {
  return prisma.jobProposal.upsert({
    where: { jobId_freelancerId: { jobId, freelancerId } },
    update: {
      coverLetter: scenario.proposal.coverLetter,
      bidAmount: new Prisma.Decimal(scenario.proposal.bidAmount),
      bidCurrency: scenario.proposal.bidCurrency,
      status: scenario.proposal.status ?? JobProposalStatus.HIRED
    },
    create: {
      jobId,
      freelancerId,
      coverLetter: scenario.proposal.coverLetter,
      bidAmount: new Prisma.Decimal(scenario.proposal.bidAmount),
      bidCurrency: scenario.proposal.bidCurrency,
      status: scenario.proposal.status ?? JobProposalStatus.HIRED,
      submittedAt: new Date(scenario.proposal.submittedAt)
    }
  })
}

async function ensureOffer(jobId: string, clientId: string, freelancerId: string, proposalId: string, scenario: Scenario) {
  const existingOffer = await prisma.jobOffer.findFirst({
    where: { jobId, freelancerId }
  })

  const baseData = {
    jobId,
    clientId,
    freelancerId,
    proposalId,
    title: scenario.offer.title,
    message: scenario.offer.message,
    type: scenario.offer.type,
    currency: scenario.offer.currency,
    fixedPrice: new Prisma.Decimal(scenario.offer.fixedPrice),
    startDate: new Date(scenario.offer.startDate),
    endDate: new Date(scenario.offer.endDate),
    expireAt: new Date(scenario.offer.expireAt),
    status: scenario.offer.status,
    sentAt: new Date(scenario.offer.sentAt),
    respondedAt: new Date(scenario.offer.respondedAt),
    isDeleted: scenario.offer.isDeleted ?? false,
    deletedAt: scenario.offer.deletedAt ? new Date(scenario.offer.deletedAt) : null
  }

  return existingOffer
    ? prisma.jobOffer.update({
        where: { id: existingOffer.id },
        data: baseData
      })
    : prisma.jobOffer.create({ data: baseData })
}

async function ensureContract(jobId: string, clientId: string, freelancerId: string, proposalId: string, offerId: string, scenario: Scenario) {
  return prisma.contract.upsert({
    where: { proposalId },
    update: {
      jobPostId: jobId,
      offerId,
      title: scenario.contract.title,
      currency: scenario.contract.currency,
      status: scenario.contract.status,
      signatureStatus: scenario.contract.signatureStatus,
      signatureProvider: scenario.contract.signatureProvider,
      signatureCompletedAt: new Date(scenario.contract.signatureCompletedAt),
      termsAcceptedAt: scenario.contract.termsAcceptedAt ? new Date(scenario.contract.termsAcceptedAt) : null,
      clientAcceptedAt: scenario.contract.clientAcceptedAt ? new Date(scenario.contract.clientAcceptedAt) : null,
      closureType: scenario.contract.closureType ?? null,
      endedAt: scenario.contract.endedAt ? new Date(scenario.contract.endedAt) : null
    },
    create: {
      clientId,
      freelancerId,
      jobPostId: jobId,
      proposalId,
      offerId,
      title: scenario.contract.title,
      currency: scenario.contract.currency,
      status: scenario.contract.status,
      signatureStatus: scenario.contract.signatureStatus,
      signatureProvider: scenario.contract.signatureProvider,
      signatureCompletedAt: new Date(scenario.contract.signatureCompletedAt),
      termsAcceptedAt: scenario.contract.termsAcceptedAt ? new Date(scenario.contract.termsAcceptedAt) : null,
      clientAcceptedAt: scenario.contract.clientAcceptedAt ? new Date(scenario.contract.clientAcceptedAt) : null,
      closureType: scenario.contract.closureType ?? null,
      endedAt: scenario.contract.endedAt ? new Date(scenario.contract.endedAt) : null
    }
  })
}

async function refreshChat(scenario: Scenario, participants: ParticipantSet, proposalId: string, contractId: string) {
  await prisma.chatThread.deleteMany({
    where: {
      type: ChatThreadType.PROJECT,
      jobPostId: participants.job.id,
      AND: [{ participants: { some: { userId: participants.client.id } } }, { participants: { some: { userId: participants.freelancer.id } } }]
    }
  })

  const thread = await prisma.chatThread.create({
    data: {
      type: ChatThreadType.PROJECT,
      jobPostId: participants.job.id,
      contractId,
      subject: scenario.chat.subject ?? participants.job.title,
      metadata: { proposalId, contractId },
      participants: {
        create: [
          {
            userId: participants.client.id,
            role: Role.CLIENT,
            joinedAt: new Date(scenario.chat.participantsJoinedAt.client)
          },
          {
            userId: participants.freelancer.id,
            role: Role.FREELANCER,
            joinedAt: new Date(scenario.chat.participantsJoinedAt.freelancer)
          }
        ]
      }
    },
    select: {
      id: true,
      participants: { select: { id: true, userId: true, role: true } }
    }
  })

  const createdMessages: { id: string }[] = []
  for (const message of scenario.chat.messages) {
    const senderId = message.sender === 'client' ? participants.client.id : participants.freelancer.id
    const senderRole = message.sender === 'client' ? Role.CLIENT : Role.FREELANCER

    const created = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        type: ChatMessageType.USER,
        senderId,
        senderRole,
        sentAt: new Date(message.sentAt),
        body: message.body,
        metadata: message.metadata ?? {}
      }
    })
    createdMessages.push({ id: created.id })
  }

  const lastMessageId = createdMessages[createdMessages.length - 1]?.id
  if (lastMessageId) {
    for (const participant of thread.participants) {
      await prisma.chatParticipant.update({
        where: { id: participant.id },
        data: { lastReadMessageId: lastMessageId, lastReadAt: new Date(scenario.chat.lastReadAt) }
      })
    }
  }
}

async function seedMatchInteractions(scenario: Scenario, participants: ParticipantSet, proposalId: string, offerId: string) {
  await prisma.matchInteraction.deleteMany({
    where: { jobId: participants.job.id, freelancerId: participants.freelancer.id, clientId: participants.client.id }
  })

  await prisma.matchInteraction.createMany({
    data: scenario.interactions.map(item => ({
      jobId: participants.job.id,
      freelancerId: participants.freelancer.id,
      clientId: participants.client.id,
      proposalId,
      actorProfileId: item.actor === 'client' ? participants.client.id : participants.freelancer.id,
      actorRole: item.actor === 'client' ? Role.CLIENT : Role.FREELANCER,
      type: item.type,
      source: item.source,
      occurredAt: new Date(item.occurredAt),
      metadata: { ...item.metadata, offerId }
    }))
  })
}

export async function seedInteractions() {
  await runStep('Seed match interactions from search to hire', async () => {
    const scenarios: Scenario[] = [
      {
        key: 'sla-portal-hire',
        jobTitle: 'Customer success portal with SLA timers',
        freelancerEmail: 'amira.nguyen@freelancer.test',
        clientEmail: 'linh.tran@client.test',
        proposal: {
          coverLetter: 'Hi Linh, I would deliver the SLA portal with auditable event logs, RBAC, and BullMQ timers that align with your incident workflows.',
          bidAmount: 17000,
          bidCurrency: 'USD',
          submittedAt: '2024-05-20T08:30:00.000Z'
        },
        offer: {
          title: 'Offer: Customer success portal with SLA timers',
          message: 'We would like to proceed with you as our partner for the SLA portal. Please accept this fixed-price offer to kick off.',
          type: JobOfferType.FIXED_PRICE,
          currency: 'USD',
          fixedPrice: 17000,
          startDate: '2024-05-27T00:00:00.000Z',
          endDate: '2024-08-27T00:00:00.000Z',
          expireAt: '2099-12-31T00:00:00.000Z',
          status: JobOfferStatus.ACCEPTED,
          sentAt: '2024-05-22T15:00:00.000Z',
          respondedAt: '2024-05-23T02:00:00.000Z'
        },
        contract: {
          title: 'SLA portal delivery contract',
          currency: 'USD',
          status: ContractStatus.ACTIVE,
          signatureStatus: ContractSignatureStatus.COMPLETED,
          signatureProvider: ContractSignatureProvider.DOCUSIGN,
          signatureCompletedAt: '2024-05-23T02:04:00.000Z',
          termsAcceptedAt: '2024-05-23T02:03:00.000Z',
          clientAcceptedAt: '2024-05-23T02:03:30.000Z'
        },
        chat: {
          participantsJoinedAt: { client: '2024-05-20T09:10:00.000Z', freelancer: '2024-05-20T09:12:00.000Z' },
          messages: [
            {
              sender: 'freelancer',
              sentAt: '2024-05-20T08:35:00.000Z',
              body: 'I dug into your spec and can map SLA timers to a BullMQ pipeline with audit logs. Happy to walk through the approach if helpful.',
              metadata: { proposalNote: true }
            },
            {
              sender: 'client',
              sentAt: '2024-05-21T09:05:00.000Z',
              body: "Thanks Amira. Let's do a 45-min video interview to review the incident workflows and see a quick demo of your monitoring setup.",
              metadata: { interview: { format: 'video', durationMinutes: 45 } }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-05-21T12:00:00.000Z',
              body: "Confirmed for 4:30 PM. I'll show the SLA breach ladder, alert fanout, and how we persist customer comms to the portal.",
              metadata: { interviewConfirmed: true }
            },
            {
              sender: 'client',
              sentAt: '2024-05-21T16:55:00.000Z',
              body: 'Solid walkthrough—please share the ERD and any dashboard screenshots so my ops lead can review.',
              metadata: { followUp: true }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-05-21T18:10:00.000Z',
              body: 'Attached ERD + Grafana panel links. I also noted a phased rollout so we can validate SLIs before hardening the automation.',
              metadata: { attachments: ['erd.pdf', 'grafana.png'] }
            },
            {
              sender: 'client',
              sentAt: '2024-05-22T14:45:00.000Z',
              body: "We're good to move forward—sending the fixed-price offer now. Once you accept, let's kick off with the runbook mapping.",
              metadata: { offerStep: true }
            }
          ],
          lastReadAt: '2024-05-23T02:10:00.000Z'
        },
        interactions: [
          {
            type: MatchInteractionType.JOB_VIEW,
            source: MatchInteractionSource.SEARCH,
            occurredAt: '2024-05-18T07:00:00.000Z',
            metadata: { query: 'fullstack SLA portal', resultRank: 3 },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROFILE_VIEW,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-19T01:10:00.000Z',
            metadata: { jobTitle: 'Customer success portal with SLA timers' },
            actor: 'client'
          },
          {
            type: MatchInteractionType.PROPOSAL_SUBMITTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-20T08:30:00.000Z',
            metadata: { bid: { amount: 17000, currency: 'USD' } },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_SHORTLISTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-21T09:00:00.000Z',
            metadata: { note: 'Strong alignment with SLA timers and observability' },
            actor: 'client'
          },
          {
            type: MatchInteractionType.PROPOSAL_INTERVIEWING,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-21T16:30:00.000Z',
            metadata: { interview: { format: 'video', durationMinutes: 45 } },
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_SENT,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-22T15:00:00.000Z',
            metadata: {},
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_ACCEPTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-23T02:00:00.000Z',
            metadata: {},
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_HIRED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-05-23T02:05:00.000Z',
            metadata: { contractStart: '2024-05-27' },
            actor: 'client'
          }
        ]
      },
      {
        key: 'field-service-invitation',
        jobTitle: 'Field service mobile app with offline sync',
        freelancerEmail: 'sofia.lima@freelancer.test',
        clientEmail: 'paulina.rivera@client.test',
        proposal: {
          coverLetter: 'Hola Paulina, I have shipped offline-first Flutter apps with background sync and analytics. I can tailor your technician workflows for LatAm connectivity patterns.',
          bidAmount: 15200,
          bidCurrency: 'USD',
          submittedAt: '2024-04-04T15:20:00.000Z',
          status: JobProposalStatus.INTERVIEWING
        },
        offer: {
          title: 'Offer: Field service mobile app pilot',
          message: 'Kicking off with an offline-first pilot for 3 districts. Accept to start the integrations and technician onboarding.',
          type: JobOfferType.FIXED_PRICE,
          currency: 'USD',
          fixedPrice: 15200,
          startDate: '2024-04-15T00:00:00.000Z',
          endDate: '2024-06-30T00:00:00.000Z',
          expireAt: '2024-04-12T00:00:00.000Z',
          status: JobOfferStatus.ACCEPTED,
          sentAt: '2024-04-05T18:00:00.000Z',
          respondedAt: '2024-04-06T08:00:00.000Z'
        },
        contract: {
          title: 'Field app pilot contract',
          currency: 'USD',
          status: ContractStatus.ACTIVE,
          signatureStatus: ContractSignatureStatus.COMPLETED,
          signatureProvider: ContractSignatureProvider.DOCUSIGN,
          signatureCompletedAt: '2024-04-06T08:05:00.000Z',
          termsAcceptedAt: '2024-04-06T08:03:00.000Z',
          clientAcceptedAt: '2024-04-06T08:03:30.000Z'
        },
        chat: {
          subject: 'Offline pilot onboarding',
          participantsJoinedAt: { client: '2024-04-04T15:30:00.000Z', freelancer: '2024-04-04T15:32:00.000Z' },
          messages: [
            {
              sender: 'client',
              sentAt: '2024-04-04T16:00:00.000Z',
              body: 'Hi Sofia, can you handle bilingual Spanish/English push notifications and background sync retries?',
              metadata: { locale: ['es', 'en'] }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-04-04T16:20:00.000Z',
              body: 'Yes—will use Firebase push with per-locale payloads and exponential retry for uploads. Sharing a short Loom of the sync state machine.',
              metadata: { loom: true }
            },
            {
              sender: 'client',
              sentAt: '2024-04-05T12:00:00.000Z',
              body: 'Great, please prioritize photo compression + GPS accuracy. Offer is on the way for the pilot scope.',
              metadata: { priorities: ['photo-compression', 'gps-accuracy'] }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-04-05T18:10:00.000Z',
              body: 'Signed the NDA and ready to accept once the offer arrives. Added a checklist for technician onboarding.',
              metadata: { ndaSigned: true }
            },
            {
              sender: 'client',
              sentAt: '2024-04-06T07:50:00.000Z',
              body: 'Offer sent—let’s kick off Monday with sync tests in a low-connectivity zone.',
              metadata: { kickoff: '2024-04-08' }
            }
          ],
          lastReadAt: '2024-04-06T08:15:00.000Z'
        },
        interactions: [
          {
            type: MatchInteractionType.INVITATION_SENT,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-03T10:00:00.000Z',
            metadata: { note: 'Invited after reviewing Flutter portfolio' },
            actor: 'client'
          },
          {
            type: MatchInteractionType.INVITATION_ACCEPTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-03T14:00:00.000Z',
            metadata: { acceptedVia: 'email' },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_SUBMITTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-04T15:20:00.000Z',
            metadata: { bid: { amount: 15200, currency: 'USD' } },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_INTERVIEWING,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-04T16:15:00.000Z',
            metadata: { interview: { format: 'call', durationMinutes: 30 } },
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_SENT,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-05T18:00:00.000Z',
            metadata: { stage: 'pilot' },
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_ACCEPTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-06T08:00:00.000Z',
            metadata: { paymentSchedule: 'milestone' },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_HIRED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-04-06T08:10:00.000Z',
            metadata: { contractStart: '2024-04-15' },
            actor: 'client'
          }
        ]
      },
      {
        key: 'design-system-archived-offer',
        jobTitle: 'Design tokens and theming for franchise rollout',
        freelancerEmail: 'hana.le@freelancer.test',
        clientEmail: 'diep.le@client.test',
        proposal: {
          coverLetter: 'I specialize in design tokens and theming systems. Sharing a token migration plan and Storybook QA gates for accessibility.',
          bidAmount: 10800,
          bidCurrency: 'USD',
          submittedAt: '2024-02-28T10:00:00.000Z',
          status: JobProposalStatus.HIRED
        },
        offer: {
          title: 'Offer: Multi-brand design system',
          message: 'Formalizing the theming rollout with token governance. This offer was later archived after the contract was signed.',
          type: JobOfferType.FIXED_PRICE,
          currency: 'USD',
          fixedPrice: 10800,
          startDate: '2024-03-04T00:00:00.000Z',
          endDate: '2024-05-30T00:00:00.000Z',
          expireAt: '2024-03-05T00:00:00.000Z',
          status: JobOfferStatus.ACCEPTED,
          sentAt: '2024-03-01T09:00:00.000Z',
          respondedAt: '2024-03-01T15:30:00.000Z',
          isDeleted: true,
          deletedAt: '2024-03-10T00:00:00.000Z'
        },
        contract: {
          title: 'Design system theming contract',
          currency: 'USD',
          status: ContractStatus.COMPLETED,
          signatureStatus: ContractSignatureStatus.COMPLETED,
          signatureProvider: ContractSignatureProvider.DOCUSIGN,
          signatureCompletedAt: '2024-03-01T15:35:00.000Z',
          termsAcceptedAt: '2024-03-01T15:33:00.000Z',
          clientAcceptedAt: '2024-03-01T15:34:00.000Z',
          closureType: 'COMPLETED',
          endedAt: '2024-05-30T00:00:00.000Z'
        },
        chat: {
          subject: 'Token rollout + audits',
          participantsJoinedAt: { client: '2024-02-28T10:05:00.000Z', freelancer: '2024-02-28T10:06:00.000Z' },
          messages: [
            {
              sender: 'client',
              sentAt: '2024-02-28T10:15:00.000Z',
              body: 'Hey Hana, our franchises need dark/light themes and WCAG AA. Can you share an audit checklist?',
              metadata: { request: 'a11y-audit' }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-02-28T11:00:00.000Z',
              body: 'Here is the audit matrix plus token taxonomy. I also attached Storybook addons for contrast checks.',
              metadata: { attachments: ['audit-matrix.xlsx'] }
            },
            {
              sender: 'client',
              sentAt: '2024-03-01T08:30:00.000Z',
              body: 'Looks good—sending you the offer to lock scope. We will archive it post-signature to reduce clutter.',
              metadata: { archivePlan: true }
            },
            {
              sender: 'freelancer',
              sentAt: '2024-03-01T15:20:00.000Z',
              body: 'Accepted and signed. Kickoff deck attached with token migration phases.',
              metadata: { attachments: ['kickoff.pdf'] }
            }
          ],
          lastReadAt: '2024-03-02T09:00:00.000Z'
        },
        interactions: [
          {
            type: MatchInteractionType.JOB_VIEW,
            source: MatchInteractionSource.RECOMMENDATION,
            occurredAt: '2024-02-27T09:00:00.000Z',
            metadata: { recommendedBecause: ['design-systems', 'storybook'] },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_SUBMITTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-02-28T10:00:00.000Z',
            metadata: { bid: { amount: 10800, currency: 'USD' } },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_SHORTLISTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-02-28T18:00:00.000Z',
            metadata: { note: 'Strong token governance experience' },
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_SENT,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-03-01T09:00:00.000Z',
            metadata: { archived: true },
            actor: 'client'
          },
          {
            type: MatchInteractionType.OFFER_ACCEPTED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-03-01T15:30:00.000Z',
            metadata: { contractLinked: true },
            actor: 'freelancer'
          },
          {
            type: MatchInteractionType.PROPOSAL_HIRED,
            source: MatchInteractionSource.DIRECT,
            occurredAt: '2024-03-02T09:00:00.000Z',
            metadata: { contractEnd: '2024-05-30' },
            actor: 'client'
          }
        ]
      }
    ]

    for (const scenario of scenarios) {
      const participants = await resolveParticipants(scenario)
      if (!participants) continue

      const proposal = await ensureProposal(participants.job.id, participants.freelancer.id, scenario)
      const offer = await ensureOffer(participants.job.id, participants.client.id, participants.freelancer.id, proposal.id, scenario)
      const contract = await ensureContract(participants.job.id, participants.client.id, participants.freelancer.id, proposal.id, offer.id, scenario)

      await refreshChat(scenario, participants, proposal.id, contract.id)
      await seedMatchInteractions(scenario, participants, proposal.id, offer.id)
    }
  })
}
