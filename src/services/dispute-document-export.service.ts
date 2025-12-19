import { prismaClient } from '~/config/prisma-client'
import { MediationProposalStatus, DisputeStatus } from '~/generated/prisma'

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
const getDisputeDocumentPackage = async (disputeId: string, userId?: string, userRole?: string): Promise<DisputeDocumentPackage> => {
  // Fetch dispute with all related data
  const dispute = await prismaClient.dispute.findUnique({
    where: { id: disputeId },
    include: {
      escrow: {
        include: {
          milestone: {
            include: {
              contract: {
                include: {
                  jobPost: {
                    include: {
                      attachments: true
                    }
                  },
                  client: {
                    include: {
                      profile: true
                    }
                  },
                  freelancer: {
                    include: {
                      profile: true
                    }
                  }
                }
              },
              submissions: {
                include: {
                  attachments: true
                }
              }
            }
          }
        }
      },
      negotiations: {
        include: {
          proposer: {
            include: {
              profile: true
            }
          },
          respondedBy: {
            include: {
              profile: true
            }
          }
        }
      },
      mediationProposals: {
        include: {
          proposedBy: {
            include: {
              profile: true
            }
          }
        }
      }
    }
  })

  if (!dispute) {
    throw new Error('Dispute not found')
  }

  if (!dispute.escrow?.milestone) {
    throw new Error('Dispute milestone not found')
  }

  const milestone = dispute.escrow.milestone
  const contract = milestone.contract
  const jobPost = contract.jobPost

  // Get full user records for client and freelancer to access email
  const [clientUser, freelancerUser] = await Promise.all([
    prismaClient.user.findUnique({
      where: { id: contract.client.userId },
      include: { profile: true }
    }),
    prismaClient.user.findUnique({
      where: { id: contract.freelancer.userId },
      include: { profile: true }
    })
  ])

  // Check access permissions for non-admin users
  if (userId && userRole && userRole !== 'ADMIN') {
    const isClientParty = contract.client.userId === userId
    const isFreelancerParty = contract.freelancer.userId === userId
    
    if (!isClientParty && !isFreelancerParty) {
      throw new Error('Access denied: You are not a participant in this dispute')
    }
  }

  // Get chat history (if available)
  let chatHistory: any[] = []
  try {
    // Try to get chat messages related to this contract through chat threads
    const chatThreads = await prismaClient.chatThread.findMany({
      where: {
        contractId: contract.id
      },
      include: {
        messages: {
          include: {
            attachments: true
          },
          orderBy: {
            sentAt: 'asc'
          }
        }
      }
    })

    // Flatten messages from all threads
    const allMessages = chatThreads.flatMap(thread => thread.messages)
    
    // Get user info for senders
    const senderIds = [...new Set(allMessages.map(msg => msg.senderId).filter((id): id is string => id !== null))]
    const users = await prismaClient.user.findMany({
      where: {
        id: { in: senderIds }
      },
      include: {
        profile: true
      }
    })
    
    const userMap = new Map(users.map(user => [user.id, user]))

    chatHistory = allMessages.map(msg => {
      const sender = msg.senderId ? userMap.get(msg.senderId) : null
      const senderName = sender ? 
        (sender.profile?.firstName && sender.profile?.lastName ? 
          `${sender.profile.firstName} ${sender.profile.lastName}`.trim() : 
          sender.email) : 
        'System'
      
      return {
        id: msg.id,
        content: msg.body || '',
        senderId: msg.senderId || '',
        senderRole: msg.senderRole || 'SYSTEM',
        senderName,
        createdAt: msg.sentAt,
        attachments: msg.attachments || []
      }
    })
  } catch (error) {
    console.warn('Could not fetch chat history:', error)
  }

  // Get evidence submissions (if available)
  let evidenceSubmissions: any[] = []
  try {
    const submissions = await prismaClient.mediationEvidenceSubmission.findMany({
      where: { disputeId: dispute.id },
      include: {
        submittedBy: {
          include: {
            profile: true
          }
        },
        items: true
      }
    })

    evidenceSubmissions = submissions.map((sub: any) => {
      const submitterName = sub.submittedBy.profile?.firstName && sub.submittedBy.profile?.lastName ? 
        `${sub.submittedBy.profile.firstName} ${sub.submittedBy.profile.lastName}`.trim() : 
        sub.submittedBy.email
      
      return {
        id: sub.id,
        submitterId: sub.submittedById,
        submitterRole: sub.submittedBy.role,
        submitterName,
        title: sub.title || 'Untitled Evidence',
        description: sub.description,
        submittedAt: sub.submittedAt || sub.createdAt,
        items: sub.items.map((item: any) => ({
          id: item.id,
          type: item.sourceType,
          title: item.label || item.fileName || 'Untitled',
          description: item.description,
          fileUrl: item.url,
          linkUrl: item.url,
          createdAt: item.createdAt
        }))
      }
    })
  } catch (error) {
    console.warn('Could not fetch evidence submissions:', error)
  }

  // Format participants
  const getParticipantName = (user: any) => {
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`.trim()
    }
    return user.email
  }

  const documentPackage: DisputeDocumentPackage = {
    dispute: {
      id: dispute.id,
      status: dispute.status,
      createdAt: dispute.createdAt,
      decidedAt: dispute.decidedAt,
      reason: dispute.note || 'Không có thông tin lý do',
      description: dispute.decisionSummary || null
    },
    contract: {
      id: contract.id,
      title: contract.title || 'Không có tiêu đề',
      description: null, // Contract model doesn't have description field
      totalAmount: Number(milestone.amount) || 0, // Use milestone amount as contract total
      startedAt: contract.createdAt, // Use createdAt as start date
      endedAt: contract.endedAt,
      status: contract.status
    },
    jobPost: jobPost ? {
      id: jobPost.id,
      title: jobPost.title,
      description: jobPost.description || '',
      budgetAmount: jobPost.budgetAmount ? Number(jobPost.budgetAmount) : null,
      budgetType: jobPost.paymentMode, // Use paymentMode instead of budgetType
      createdAt: jobPost.createdAt,
      requirements: jobPost.description || '', // Use description as requirements
      attachments: jobPost.attachments || []
    } : {
      id: 'N/A',
      title: 'Không có thông tin công việc',
      description: '',
      budgetAmount: null,
      budgetType: 'FIXED_SINGLE',
      createdAt: contract.createdAt,
      requirements: '',
      attachments: []
    },
    milestones: [{
      id: milestone.id,
      title: milestone.title,
      description: null, // Milestone model doesn't have description field
      amount: Number(milestone.amount),
      startAt: milestone.startAt || milestone.createdAt,
      endAt: milestone.endAt || milestone.createdAt,
      status: milestone.status,
      submissions: milestone.submissions.map((sub: any) => ({
        id: sub.id,
        description: sub.description,
        submittedAt: sub.submittedAt || sub.createdAt,
        attachments: sub.attachments || [],
        feedback: null // MilestoneSubmission doesn't have feedback relation
      }))
    }],
    chatHistory,
    negotiations: {
      directNegotiation: dispute.negotiations.map((neg: any) => ({
        id: neg.id,
        proposerId: neg.proposerId,
        proposerRole: neg.proposer.role,
        proposerName: getParticipantName(neg.proposer),
        type: neg.type,
        amount: neg.amount ? Number(neg.amount) : null,
        description: neg.description,
        status: neg.status,
        createdAt: neg.createdAt,
        respondedAt: neg.respondedAt,
        responseReason: neg.responseReason
      })),
      mediationProposals: dispute.mediationProposals.map((prop: any) => ({
        id: prop.id,
        adminId: prop.proposedById,
        adminName: getParticipantName(prop.proposedBy),
        type: 'MEDIATION_PROPOSAL',
        clientAmount: prop.refundAmount ? Number(prop.refundAmount) : null,
        freelancerAmount: prop.releaseAmount ? Number(prop.releaseAmount) : null,
        reasoning: prop.reasoning || 'No reasoning provided',
        status: prop.status,
        createdAt: prop.createdAt,
        clientResponse: {
          status: prop.clientResponse,
          respondedAt: prop.clientRespondedAt,
          reason: prop.clientResponseMessage
        },
        freelancerResponse: {
          status: prop.freelancerResponse,
          respondedAt: prop.freelancerRespondedAt,
          reason: prop.freelancerResponseMessage
        }
      }))
    },
    evidenceSubmissions,
    participants: {
      client: {
        id: contract.client.userId,
        name: clientUser ? getParticipantName(clientUser) : 'Unknown Client',
        email: clientUser?.email || 'N/A'
      },
      freelancer: {
        id: contract.freelancer.userId,
        name: freelancerUser ? getParticipantName(freelancerUser) : 'Unknown Freelancer',
        email: freelancerUser?.email || 'N/A'
      },
      admin: dispute.mediationProposals.length > 0 && dispute.mediationProposals[0]?.proposedBy ? {
        id: dispute.mediationProposals[0].proposedBy.id,
        name: getParticipantName(dispute.mediationProposals[0].proposedBy),
        email: dispute.mediationProposals[0].proposedBy.email
      } : null
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
      status: 'CLOSED_FOR_EXTERNAL_RESOLUTION' as any,
      decidedAt: new Date(),
      decidedById: adminId,
      note: reason
    }
  })

  return updatedDispute
}

/**
 * Check if dispute is eligible for document export
 */
const isEligibleForDocumentExport = async (disputeId: string, userId?: string, userRole?: string): Promise<boolean> => {
  const dispute = await prismaClient.dispute.findUnique({
    where: { id: disputeId },
    include: {
      escrow: {
        include: {
          milestone: {
            include: {
              contract: {
                include: {
                  client: true,
                  freelancer: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!dispute || !dispute.escrow?.milestone?.contract) return false

  // Check access permissions for non-admin users
  if (userId && userRole && userRole !== 'ADMIN') {
    const contract = dispute.escrow.milestone.contract
    const isClientParty = contract.client.userId === userId
    const isFreelancerParty = contract.freelancer.userId === userId
    
    if (!isClientParty && !isFreelancerParty) {
      return false // Access denied
    }
  }

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