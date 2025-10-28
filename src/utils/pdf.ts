import { Buffer } from 'node:buffer'

const DEFAULT_FONT_SIZE = 12
const DEFAULT_LINE_WIDTH = 110
const PAGE_MARGIN = 72
const PAGE_HEIGHT = 792
const DEFAULT_LEADING = 16

const normalizeLine = (line: string) =>
    line
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')

const chunkLine = (line: string): string[] => {
    const segments: string[] = []

    normalizeLine(line).forEach(part => {
        const printable = part.length > 0 ? part : ' '
        let remaining = printable

        while (remaining.length > DEFAULT_LINE_WIDTH) {
            segments.push(remaining.slice(0, DEFAULT_LINE_WIDTH))
            remaining = remaining.slice(DEFAULT_LINE_WIDTH)
        }

        segments.push(remaining.length > 0 ? remaining : ' ')
    })

    if (segments.length === 0) {
        segments.push(' ')
    }

    return segments
}

const removeDiacritics = (input: string) =>
    input
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .replace(/[\u0100-\uFFFF]/g, '?')

const escapePdfString = (input: string) =>
    input
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')

const buildContentStream = (lines: string[]): string => {
    const contentParts: string[] = [
        'BT',
        `/F1 ${DEFAULT_FONT_SIZE} Tf`,
        `${DEFAULT_LEADING} TL`,
        `1 0 0 1 ${PAGE_MARGIN} ${PAGE_HEIGHT - PAGE_MARGIN} Tm`
    ]

    let currentFontSize = DEFAULT_FONT_SIZE
    let currentLeading = DEFAULT_LEADING
    let isFirstLine = true
    let pendingBlankLines = 0

    const ensureFontSize = (size: number) => {
        if (currentFontSize !== size) {
            contentParts.push(`/F1 ${size} Tf`)
            currentFontSize = size
        }

        const desiredLeading = Math.max(Math.round(size * 1.35), DEFAULT_LEADING)

        if (currentLeading !== desiredLeading) {
            contentParts.push(`${desiredLeading} TL`)
            currentLeading = desiredLeading
        }
    }

    const moveToNextLine = () => {
        if (isFirstLine) {
            isFirstLine = false
        } else {
            contentParts.push('T*')
        }

        while (pendingBlankLines > 0) {
            contentParts.push('T*')
            pendingBlankLines -= 1
        }
    }

    const writeSegments = (text: string, fontSize: number) => {
        const segments = chunkLine(text)

        segments.forEach(segment => {
            moveToNextLine()
            ensureFontSize(fontSize)

            const printable = segment.length > 0 ? segment : ' '
            const escaped = escapePdfString(removeDiacritics(printable))

            contentParts.push(`(${escaped.length > 0 ? escaped : ' '}) Tj`)
        })
    }

    const writeHeading = (text: string, fontSize: number, extraSpacing: number) => {
        const normalized = text.trim()

        if (normalized.length === 0) {
            return
        }

        writeSegments(normalized, fontSize)
        pendingBlankLines = Math.max(pendingBlankLines, extraSpacing)
    }

    if (lines.length === 0) {
        writeSegments('No content', DEFAULT_FONT_SIZE)
    } else {
        lines.forEach(rawLine => {
            const line = rawLine ?? ''

            if (line.startsWith('# ')) {
                writeHeading(line.slice(2).toUpperCase(), 18, 2)
                return
            }

            if (line.startsWith('## ')) {
                writeHeading(line.slice(3), 14, 1)
                return
            }

            if (line.startsWith('### ')) {
                writeHeading(line.slice(4), 12, 1)
                return
            }

            if (line.trim().length === 0) {
                pendingBlankLines += 1
                return
            }

            writeSegments(line, DEFAULT_FONT_SIZE)
        })
    }

    contentParts.push('ET')

    return contentParts.join('\n')
}

export const createSimplePdf = (lines: string[]): Buffer => {
    const contentStream = buildContentStream(lines)
    const contentLength = Buffer.byteLength(contentStream, 'binary')

    const header = '%PDF-1.4\n%âãÏÓ\n'
    const objects: string[] = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
        `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
    ]

    const offsets: number[] = [0]
    let position = Buffer.byteLength(header, 'binary')

    objects.forEach(obj => {
        offsets.push(position)
        position += Buffer.byteLength(obj, 'binary')
    })

    const startXref = position
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`

    for (let i = 1; i < offsets.length; i += 1) {
        const offsetValue = offsets[i] ?? 0
        xref += `${offsetValue.toString().padStart(10, '0')} 00000 n \n`
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`

    const pdfContent = header + objects.join('') + xref + trailer

    return Buffer.from(pdfContent, 'binary')
}

export default createSimplePdf
