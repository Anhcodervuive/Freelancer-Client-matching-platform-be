import nodemailer from 'nodemailer'
import { MAIL } from '~/config/environment'
import { renderEmailTemplate } from '~/helpers/render'

export async function sendVerifyEmail(to: string, name: string, verifyLink: string) {
	try {
		const html = renderEmailTemplate('verify-email.hbs', {
			to,
			name,
			verifyLink
		})

		// Cấu hình transporter (có thể dùng Gmail hoặc dịch vụ SMTP khác)
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: {
				user: MAIL.USERNAME, // Email gửi đi
				pass: MAIL.PASSWORD // App password hoặc pass mail
			}
		})

		// Gửi email
		await transporter.sendMail({
			from: `${MAIL.NAME} <no-reply@myapp.com>`,
			to,
			subject: 'Xác nhận tài khoản',
			html
		})
	} catch (error) {
		console.log(error)
	}
}
