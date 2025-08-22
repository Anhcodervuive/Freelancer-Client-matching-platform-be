import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { MAIL } from '~/config/environment'

export async function sendVerifyEmail(to: string, name: string, verifyLink: string) {
	// Đọc template HTML
	const templatePath = path.join(__dirname, '../templates/email/verify-email.html')
	let html = fs.readFileSync(templatePath, 'utf8')

	// Thay các biến động
	html = html.replace('{{name}}', name).replace('{{verifyLink}}', verifyLink)

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
}
