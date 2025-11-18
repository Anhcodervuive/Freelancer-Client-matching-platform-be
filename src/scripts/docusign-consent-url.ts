import { DOCUSIGN } from '~/config/environment'
import { buildDocuSignConsentUrl } from '~/services/docusign.service'

const missing: string[] = []

if (!DOCUSIGN.INTEGRATION_KEY) missing.push('DOCUSIGN_INTEGRATION_KEY')
if (!DOCUSIGN.USER_ID) missing.push('DOCUSIGN_USER_ID')
if (!DOCUSIGN.CONSENT_REDIRECT_URI) missing.push('DOCUSIGN_CONSENT_REDIRECT_URI')

if (missing.length > 0) {
        console.error(
                `Thiếu cấu hình DocuSign (${missing.join(', ')}). Kiểm tra file .env trước khi tạo URL consent.`
        )
        process.exitCode = 1
} else {
        const consentUrl = buildDocuSignConsentUrl()
        console.log('DocuSign consent URL:')
        console.log(consentUrl)
        console.log('\nHướng dẫn:')
        console.log(
                `1. Đăng nhập tài khoản DocuSign sandbox bằng user có GUID ${DOCUSIGN.USER_ID}. (User này phải có quyền admin hoặc được cấp quyền truy cập API.)`
        )
        console.log('2. Mở URL ở trên trong cùng trình duyệt đã đăng nhập và chấp thuận.')
        console.log('3. Sau khi DocuSign báo "Consent Successful" bạn có thể quay lại backend và thử lại.')
}
