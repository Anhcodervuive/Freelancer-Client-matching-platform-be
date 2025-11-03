import { JOB_MODERATION } from '~/config/environment'

const PREFIX = '[JobModeration]'

export const logModeration = (...messages: unknown[]) => {
        if (!JOB_MODERATION.LOG_VERBOSE) return
        console.log(PREFIX, ...messages)
}

export const logModerationError = (...messages: unknown[]) => {
        if (JOB_MODERATION.LOG_VERBOSE) {
                console.error(PREFIX, ...messages)
                return
        }

        // Luôn hiển thị lỗi quan trọng ngay cả khi tắt verbose
        console.error(PREFIX, ...messages)
}
