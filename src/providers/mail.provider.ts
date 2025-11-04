import nodemailer from 'nodemailer'

import { MAIL } from '~/config/environment'
import { renderEmailTemplate } from '~/helpers/render'

type DisputeNegotiationEmailPayload = {
        action: 'created' | 'updated' | 'deleted' | 'accepted' | 'rejected'
        actorName: string
        milestoneTitle: string
        contractTitle: string
        disputeUrl: string
        releaseAmount: number
        refundAmount: number
        currency: string
        message: string | null
        showDeadlineNotice: boolean
}

type ArbitrationDecisionEmailPayload = {
        recipientName: string
        role: 'CLIENT' | 'FREELANCER'
        milestoneTitle: string
        contractTitle: string
        disputeUrl: string
        releaseAmount: number
        refundAmount: number
        currency: string
        summary: string
        reasoning: string | null
        awardType: 'RELEASE_ALL' | 'REFUND_ALL' | 'SPLIT'
}

type UserBanEmailPayload = {
        recipientName: string
        reason: string
        note?: string | null
        expiresAt?: Date | null
}

type UserUnbanEmailPayload = {
        recipientName: string
        reason: string
        note?: string | null
        reactivated: boolean
}

type JobModerationEmailPayload = {
        recipientName: string
        jobTitle: string
        statusLabel: string
        summary: string
        categoryLabel: string
        scoreLabel: string
        scorePercentLabel: string
        dashboardUrl?: string | null
}

const createTransporter = () => {
        return nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                        user: MAIL.USERNAME,
                        pass: MAIL.PASSWORD
                }
        })
}

const getSenderLabel = () => {
        const fallbackName = 'LVTN Platform'
        const displayName = MAIL.NAME?.trim()
        return `${displayName && displayName.length > 0 ? displayName : fallbackName} <no-reply@myapp.com>`
}

const formatCurrency = (amount: number, currency: string) => {
        const normalizedCurrency = currency?.toUpperCase() || 'USD'

        try {
                return new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: normalizedCurrency
                }).format(amount)
        } catch (error) {
                return `${amount.toFixed(2)} ${normalizedCurrency}`
        }
}

const formatDateTime = (date: Date) => {
        try {
                return new Intl.DateTimeFormat('vi-VN', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                }).format(date)
        } catch (error) {
                return date.toISOString()
        }
}

const sendMail = async (options: { to: string; subject: string; html: string }) => {
        try {
                const transporter = createTransporter()
                await transporter.sendMail({
                        from: getSenderLabel(),
                        to: options.to,
                        subject: options.subject,
                        html: options.html
                })
        } catch (error) {
                console.log(error)
        }
}

export async function sendVerifyEmail(to: string, name: string, verifyLink: string) {
        const subject = 'Xác nhận tài khoản'
        const html = renderEmailTemplate('verify-email.hbs', {
                to,
                name,
                verifyLink
        })

        await sendMail({ to, subject, html })
}

export async function sendDisputeNegotiationEmail(
        to: string,
        recipientName: string,
        payload: DisputeNegotiationEmailPayload
) {
        const copy = {
                created: {
                        subject: 'Đề xuất tranh chấp mới',
                        heading: 'Có đề xuất thương lượng mới',
                        description: `${payload.actorName} vừa gửi đề xuất thương lượng mới cho milestone "${payload.milestoneTitle}" thuộc hợp đồng "${payload.contractTitle}".`
                },
                updated: {
                        subject: 'Đề xuất tranh chấp đã được cập nhật',
                        heading: 'Đề xuất tranh chấp được chỉnh sửa',
                        description: `${payload.actorName} đã cập nhật đề xuất thương lượng cho milestone "${payload.milestoneTitle}".`
                },
                deleted: {
                        subject: 'Đề xuất tranh chấp đã bị rút lại',
                        heading: 'Đề xuất thương lượng đã được rút',
                        description: `${payload.actorName} đã rút đề xuất thương lượng trước đó cho milestone "${payload.milestoneTitle}".`
                },
                accepted: {
                        subject: 'Đề xuất tranh chấp được chấp nhận',
                        heading: 'Thỏa thuận tranh chấp đã đạt được',
                        description: `${payload.actorName} đã chấp nhận đề xuất thương lượng cho milestone "${payload.milestoneTitle}".`
                },
                rejected: {
                        subject: 'Đề xuất tranh chấp bị từ chối',
                        heading: 'Đề xuất thương lượng bị từ chối',
                        description: `${payload.actorName} đã từ chối đề xuất thương lượng cho milestone "${payload.milestoneTitle}".`
                }
        }[payload.action]

        const html = renderEmailTemplate('dispute-negotiation-update.hbs', {
                subject: copy.subject,
                heading: copy.heading,
                recipientName,
                actionDescription: copy.description,
                actorName: payload.actorName,
                milestoneTitle: payload.milestoneTitle,
                contractTitle: payload.contractTitle,
                releaseAmount: formatCurrency(payload.releaseAmount, payload.currency),
                refundAmount: formatCurrency(payload.refundAmount, payload.currency),
                message: payload.message,
                ctaLink: payload.disputeUrl,
                showDeadlineNotice: payload.showDeadlineNotice
        })

        await sendMail({ to, subject: copy.subject, html })
}

const buildArbitrationDecisionOutcome = (
        payload: ArbitrationDecisionEmailPayload,
        formattedReleaseAmount: string,
        formattedRefundAmount: string
) => {
        if (payload.role === 'FREELANCER') {
                if (payload.releaseAmount > 0) {
                        return `Bạn sẽ nhận ${formattedReleaseAmount} từ khoản escrow tranh chấp.`
                }

                if (payload.awardType === 'REFUND_ALL') {
                        return 'Toàn bộ khoản tranh chấp sẽ được hoàn lại cho client.'
                }

                return 'Bạn sẽ không nhận thêm khoản thanh toán nào từ khoản escrow tranh chấp.'
        }

        if (payload.refundAmount > 0) {
                return `Bạn sẽ được hoàn lại ${formattedRefundAmount} từ khoản escrow tranh chấp.`
        }

        if (payload.awardType === 'RELEASE_ALL') {
                return 'Toàn bộ khoản tranh chấp sẽ được chuyển cho freelancer.'
        }

        return 'Bạn sẽ không nhận khoản hoàn nào từ khoản escrow tranh chấp.'
}

export async function sendArbitrationDecisionEmail(to: string, payload: ArbitrationDecisionEmailPayload) {
        const formattedReleaseAmount = formatCurrency(payload.releaseAmount, payload.currency)
        const formattedRefundAmount = formatCurrency(payload.refundAmount, payload.currency)
        const recipientOutcome = buildArbitrationDecisionOutcome(
                payload,
                formattedReleaseAmount,
                formattedRefundAmount
        )

        const subject = `Quyết định trọng tài cho tranh chấp "${payload.milestoneTitle}"`
        const html = renderEmailTemplate('arbitration-decision.hbs', {
                subject,
                recipientName: payload.recipientName,
                milestoneTitle: payload.milestoneTitle,
                contractTitle: payload.contractTitle,
                summary: payload.summary,
                reasoning: payload.reasoning,
                formattedReleaseAmount,
                formattedRefundAmount,
                recipientOutcome,
                ctaLink: payload.disputeUrl
        })

        await sendMail({ to, subject, html })
}

export async function sendJobModerationWarningEmail(to: string, payload: JobModerationEmailPayload) {
        const subject = `Cảnh báo nội dung cho job "${payload.jobTitle}"`
        const html = renderEmailTemplate('job-moderation-warning.hbs', {
                subject,
                ...payload
        })

        await sendMail({ to, subject, html })
}

export async function sendJobModerationRemovalEmail(to: string, payload: JobModerationEmailPayload) {
        const subject = `Job "${payload.jobTitle}" đã bị gỡ do vi phạm chính sách`
        const html = renderEmailTemplate('job-moderation-removal.hbs', {
                subject,
                ...payload
        })

        await sendMail({ to, subject, html })
}

export async function sendUserBanEmail(to: string, payload: UserBanEmailPayload) {
        const subject = 'Tài khoản của bạn đã bị cấm hoạt động'
        const html = renderEmailTemplate('user-ban-notification.hbs', {
                subject,
                recipientName: payload.recipientName,
                reason: payload.reason,
                note: payload.note,
                expiresAt: payload.expiresAt ? formatDateTime(payload.expiresAt) : null
        })

        await sendMail({ to, subject, html })
}

export async function sendUserUnbanEmail(to: string, payload: UserUnbanEmailPayload) {
        const subject = 'Tài khoản của bạn đã được mở khóa'
        const html = renderEmailTemplate('user-unban-notification.hbs', {
                subject,
                recipientName: payload.recipientName,
                reason: payload.reason,
                note: payload.note,
                reactivated: payload.reactivated
        })

        await sendMail({ to, subject, html })
}
