import { prismaClient } from '~/config/prisma-client'
import { DisputeStatus, MediationProposalStatus } from '~/generated/prisma'

interface DisputeDocumentPackage {
  dispute: {
    id: string
    status: string
    createdAt: Date
    decidedAt: Date | null
    reason: string
    description: string | null
  }
  contract: {
    id: string
    title: string
    description: string | null
    totalAmount: number
    startedAt: Date
    endedAt: Date | null
    status: string
  }
  jobPost: {
    id: string
    title: string
    description: string
    budgetAmount: number | null
    budgetType: string
    createdAt: Date
    requirements: string | null
    attachments: any[]
  }
  milestones: Array<{
    id: string
    title: string
    description: string | null
    amount: number
    startAt: Date
    endAt: Date
    status: string
    submissions: Array<{
      id: string
      description: string | null
      submittedAt: Date
      attachments: any[]
      feedback: {
        rating: number | null
        comment: string | null
        createdAt: Date
      } | null
    }>
  }>
  chatHistory: Array<{
    id: string
    content: string
    senderId: string
    senderRole: string
    senderName: string
    createdAt: Date
    attachments: any[]
  }>
  negotiations: {
    directNegotiation: Array<{
      id: string
      proposerId: string
      proposerRole: string
      proposerName: string
      type: string
      amount: number | null
      description: string | null
      status: string
      createdAt: Date
      respondedAt: Date | null
      responseReason: string | null
    }>
    mediationProposals: Array<{
      id: string
      adminId: string
      adminName: string
      type: string
      clientAmount: number | null
      freelancerAmount: number | null
      reasoning: string
      status: string
      createdAt: Date
      clientResponse: {
        status: string
        respondedAt: Date | null
        reason: string | null
      } | null
      freelancerResponse: {
        status: string
        respondedAt: Date | null
        reason: string | null
      } | null
    }>
  }
  evidenceSubmissions: Array<{
    id: string
    submitterId: string
    submitterRole: string
    submitterName: string
    title: string
    description: string | null
    submittedAt: Date
    items: Array<{
      id: string
      type: string
      title: string
      description: string | null
      fileUrl: string | null
      linkUrl: string | null
      createdAt: Date
    }>
  }>
  participants: {
    client: {
      id: string
      name: string
      email: string
    }
    freelancer: {
      id: string
      name: string
      email: string
    }
    admin: {
      id: string
      name: string
      email: string
    } | null
  }
}

/**
 * Get complete dispute document package for export
 */
const getDisputeDocumentPackage = async (disputeId: string): Promise<DisputeDocumentPackage> => {
  // For now, return a simplified mock structure
  // TODO: Implement full data fetching after fixing Prisma schema issues
  
  const dispute = await prismaClient.dispute.findUnique({
    where: { id: disputeId }
  })

  if (!dispute) {
    throw new Error('Dispute not found')
  }

  // Mock document package for now
  const documentPackage: DisputeDocumentPackage = {
    dispute: {
      id: dispute.id,
      status: dispute.status,
      createdAt: dispute.createdAt,
      decidedAt: dispute.decidedAt,
      reason: 'Mock reason', // dispute.reason,
      description: 'Mock description' // dispute.description
    },
    contract: {
      id: 'mock-contract-id',
      title: 'Mock Contract',
      description: 'Mock contract description',
      totalAmount: 1000,
      startedAt: new Date(),
      endedAt: null,
      status: 'ACTIVE'
    },
    jobPost: {
      id: 'mock-job-id',
      title: 'Mock Job Post',
      description: 'Mock job description',
      budgetAmount: 1000,
      budgetType: 'FIXED',
      createdAt: new Date(),
      requirements: 'Mock requirements',
      attachments: []
    },
    milestones: [],
    chatHistory: [],
    negotiations: {
      directNegotiation: [],
      mediationProposals: []
    },
    evidenceSubmissions: [],
    participants: {
      client: {
        id: 'mock-client-id',
        name: 'Mock Client',
        email: 'client@example.com'
      },
      freelancer: {
        id: 'mock-freelancer-id',
        name: 'Mock Freelancer',
        email: 'freelancer@example.com'
      },
      admin: {
        id: 'mock-admin-id',
        name: 'Mock Admin',
        email: 'admin@example.com'
      }
    }
  }

  return documentPackage
}

/**
 * Close mediation and mark dispute for external resolution
 */
const closeMediationForExternalResolution = async (disputeId: string, adminId: string, reason: string) => {
  // Update dispute status
  const updatedDispute = await prismaClient.dispute.update({
    where: { id: disputeId },
    data: {
      status: 'CLOSED_FOR_EXTERNAL_RESOLUTION' as any, // We added this status to enum
      decidedAt: new Date()
      // TODO: Add adminId and description fields to Dispute model
      // adminId: adminId,
      // description: reason
    }
  })

  return updatedDispute
}

/**
 * Check if dispute is eligible for document export
 */
const isEligibleForDocumentExport = async (disputeId: string): Promise<boolean> => {
  const dispute = await prismaClient.dispute.findUnique({
    where: { id: disputeId }
  })

  if (!dispute) return false

  // Check if dispute is in mediation status
  if (dispute.status !== 'INTERNAL_MEDIATION') return false

  // Check if there have been multiple failed mediation attempts
  const failedProposals = await prismaClient.mediationProposal.count({
    where: {
      disputeId: dispute.id,
      status: MediationProposalStatus.REJECTED
    }
  })

  // Eligible if there are at least 2 failed mediation attempts
  return failedProposals >= 2
}

// Export service
const disputeDocumentExportService = {
  getDisputeDocumentPackage,
  closeMediationForExternalResolution,
  isEligibleForDocumentExport
}

export default disputeDocumentExportService