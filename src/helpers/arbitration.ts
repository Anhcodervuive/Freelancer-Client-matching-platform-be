import { ForbiddenException } from '~/exceptions/Forbidden'
import { ErrorCode } from '~/exceptions/root'

export const throwArbitrationDisabled = (): never => {
    throw new ForbiddenException(
        'Tính năng trọng tài đã bị vô hiệu hóa. Nền tảng chỉ hỗ trợ hòa giải do admin và hướng dẫn hai bên tự xử lý qua tòa án.',
        ErrorCode.FORBIDDEN
    )
}
