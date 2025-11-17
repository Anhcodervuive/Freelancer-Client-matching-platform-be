import crypto from 'node:crypto'

import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import { DOCUSIGN } from '~/config/environment'
import { ErrorCode } from '~/exceptions/root'
import { UnauthorizedException } from '~/exceptions/unauthoried'
import contractSignatureService from '~/services/contract-signature.service'

const verifyDocuSignSignature = (req: Request) => {
        if (!DOCUSIGN.WEBHOOK_SECRET) {
                return true
        }

        const header = req.get('x-docusign-signature-1')
        if (!header) {
                return false
        }

        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))
        const computed = crypto.createHmac('sha256', DOCUSIGN.WEBHOOK_SECRET).update(rawBody).digest('base64')

        try {
                const expectedBuffer = Buffer.from(computed, 'base64')
                const providedBuffer = Buffer.from(header, 'base64')
                if (expectedBuffer.length !== providedBuffer.length) {
                        return false
                }
                return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
        } catch {
                return false
        }
}

export const handleDocuSignWebhook = async (req: Request, res: Response) => {
        if (!verifyDocuSignSignature(req)) {
                throw new UnauthorizedException('Chữ ký DocuSign không hợp lệ', ErrorCode.UNAUTHORIED)
        }

        await contractSignatureService.handleDocuSignConnectEvent(req.body)

        return res.status(StatusCodes.NO_CONTENT).send()
}
