import { DOCUSIGN } from '~/config/environment'
import { buildDocuSignConsentUrl } from '~/services/docusign.service'

const green = (text: string) => `\x1b[32m${text}\x1b[0m`
const red = (text: string) => `\x1b[31m${text}\x1b[0m`
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`

const checklist: Array<{ label: string; ok: boolean; help?: string }> = [
        {
                label: 'DOCUSIGN_INTEGRATION_KEY',
                ok: Boolean(DOCUSIGN.INTEGRATION_KEY),
                help: 'Apps & Keys → Integration Key (GUID)'
        },
        {
                label: 'DOCUSIGN_USER_ID',
                ok: Boolean(DOCUSIGN.USER_ID),
                help: 'Users → API Username / GUID (phải trùng tài khoản cấp consent)'
        },
        {
                label: 'DOCUSIGN_ACCOUNT_ID',
                ok: Boolean(DOCUSIGN.ACCOUNT_ID),
                help: 'Apps & Keys → API Account ID'
        },
        {
                label: 'DOCUSIGN_PRIVATE_KEY',
                ok: Boolean(DOCUSIGN.PRIVATE_KEY?.includes('BEGIN RSA PRIVATE KEY')),
                help: 'Key phải là PEM, có BEGIN/END RSA PRIVATE KEY'
        }
]

console.log(cyan('\nDocuSign configuration check'))
console.log('------------------------------------')

let hasError = false

for (const item of checklist) {
        if (item.ok) {
                console.log(`${green('✔')} ${item.label}`)
        } else {
                hasError = true
                console.log(`${red('✖')} ${item.label} - ${item.help ?? 'Thiếu giá trị trong .env'}`)
        }
}

if (!DOCUSIGN.CONSENT_REDIRECT_URI) {
        hasError = true
        console.log(
                `${red('✖')} DOCUSIGN_CONSENT_REDIRECT_URI - dùng https://developers.docusign.com/platform/auth/consent hoặc URL tùy chỉnh đã đăng ký`
        )
} else {
        console.log(`${green('✔')} DOCUSIGN_CONSENT_REDIRECT_URI = ${DOCUSIGN.CONSENT_REDIRECT_URI}`)
}

console.log('\nThông tin bổ sung:')
console.log(`- AUTH SERVER: ${DOCUSIGN.AUTH_SERVER}`)
console.log(`- BASE URL: ${DOCUSIGN.BASE_URL}`)
console.log(`- WEBHOOK SECRET: ${DOCUSIGN.WEBHOOK_SECRET ? 'đã cấu hình' : 'chưa thiết lập (optional)'}`)

if (DOCUSIGN.PLATFORM_SIGNER) {
        console.log(`- PLATFORM SIGNER: ${DOCUSIGN.PLATFORM_SIGNER.name} <${DOCUSIGN.PLATFORM_SIGNER.email}>`)
} else {
        console.log('- PLATFORM SIGNER: chưa cấu hình (optional)')
}

try {
        const redirectUrl = new URL(DOCUSIGN.CONSENT_REDIRECT_URI)
        const authUrl = new URL(DOCUSIGN.AUTH_SERVER)
        const looksLikeConsentUrl =
                redirectUrl.host === authUrl.host && redirectUrl.pathname.startsWith('/oauth/auth')

        if (looksLikeConsentUrl) {
                console.log(
                        yellow(
                                '\n⚠️  DOCUSIGN_CONSENT_REDIRECT_URI đang trỏ trực tiếp tới URL consent của DocuSign. ' +
                                        'Trường này phải là trang đích (ví dụ https://developers.docusign.com/platform/auth/consent) và cũng là giá trị bạn thêm ở Apps & Keys → Additional settings → Redirect URIs.'
                        )
                )
                console.log(
                        yellow(
                                '    → Hãy nhập lại giá trị DOCUSIGN_CONSENT_REDIRECT_URI, sau đó chạy lại script và dán đúng URL vào bảng Redirect URIs (không bao gồm /oauth/auth hay query string).'
                        )
                )
        }
} catch {
        // ignore invalid URLs; đã được bắt ở bước kiểm tra bắt buộc
}

if (hasError) {
        console.log(
                red('\nThiếu cấu hình DocuSign. Kiểm tra các biến ở trên rồi chạy lại `npm run docusign:check`.')
        )
        process.exitCode = 1
        process.exit()
}

const consentUrl = buildDocuSignConsentUrl()
console.log('\nConsent URL (dùng để cấp quyền JWT):')
console.log(yellow(consentUrl))

console.log('\nCách cấp quyền:')
console.log(
        '1. Đăng nhập https://account-d.docusign.com bằng tài khoản có GUID trùng DOCUSIGN_USER_ID (thường là email admin).'
)
console.log('2. Mở URL ở trên trong cùng trình duyệt và bấm Accept.')
console.log(
        '3. Nếu DocuSign báo lỗi redirect URI chưa đăng ký, vào Apps & Keys → Integration Key → Additional settings → Redirect URIs và thêm giá trị DOCUSIGN_CONSENT_REDIRECT_URI.'
)
console.log('4. Khi DocuSign báo "Consent successful", chạy lại tác vụ gửi hợp đồng.')
