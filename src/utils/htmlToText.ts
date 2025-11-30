// src/utils/htmlToText.ts
import { load } from 'cheerio'

export function htmlToPlainText(html?: string | null): string {
	if (!html) return ''

	const $ = load(html)

	// Bỏ script, style, noscript cho chắc
	$('script, style, noscript').remove()

	// Biến <li> thành dạng "- text"
	$('li').each((_, el) => {
		const li = $(el)
		const text = li.text()
		li.replaceWith(`- ${text}\n`)
	})

	// Lấy toàn bộ text trong body
	const text = $.root().text()

	// Thu gọn khoảng trắng
	return text.replace(/\s+/g, ' ').trim()
}
