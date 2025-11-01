import { Request } from 'express'

import { Role } from '~/generated/prisma'
import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'

export const ensureAdminUser = (req: Request) => {
    const user = req.user

    if (!user || user.role !== Role.ADMIN) {
        throw new ForbiddenException('Chỉ admin mới được phép truy cập tính năng này', ErrorCode.FORBIDDEN)
    }

    return user
}
