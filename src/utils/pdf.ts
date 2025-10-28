import { Buffer } from 'node:buffer'

const DEFAULT_FONT_SIZE = 12
const DEFAULT_LINE_WIDTH = 100
const PAGE_MARGIN = 64
const PAGE_HEIGHT = 792
const DEFAULT_LEADING = 18
const NEWLINE = '\r\n'

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

const buildContentStream = (lines: string[]): Buffer => {
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

    return Buffer.from(contentParts.join(NEWLINE), 'utf8')
}

export const createSimplePdf = (lines: string[]): Buffer => {
    const streamBuffer = buildContentStream(lines)

    const contentLength = streamBuffer.length

    const headerBuffer = Buffer.from(`%PDF-1.4${NEWLINE}%âãÏÓ${NEWLINE}`, 'utf8')

    const objects: Buffer[] = [
        Buffer.from(`1 0 obj${NEWLINE}<< /Type /Catalog /Pages 2 0 R >>${NEWLINE}endobj${NEWLINE}`, 'utf8'),
        Buffer.from(`2 0 obj${NEWLINE}<< /Type /Pages /Kids [3 0 R] /Count 1 >>${NEWLINE}endobj${NEWLINE}`, 'utf8'),
        Buffer.from(
            `3 0 obj${NEWLINE}<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>${NEWLINE}endobj${NEWLINE}`,
            'utf8'
        ),
        Buffer.concat([
            Buffer.from(`4 0 obj${NEWLINE}<< /Length ${contentLength} >>${NEWLINE}stream${NEWLINE}`, 'utf8'),
            streamBuffer,
            Buffer.from(`${NEWLINE}endstream${NEWLINE}endobj${NEWLINE}`, 'utf8')
        ]),
        Buffer.from(
            `5 0 obj${NEWLINE}<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>${NEWLINE}endobj${NEWLINE}`,
            'utf8'
        )
    ]

    const offsets: number[] = [0]
    let position = headerBuffer.length

    objects.forEach(objectBuffer => {
        offsets.push(position)
        position += objectBuffer.length
    })

    const xrefEntries = offsets
        .map((offset, index) =>
            index === 0 ? '0000000000 65535 f ' : `${offset.toString().padStart(10, '0')} 00000 n `
        )
        .map(entry => `${entry}${NEWLINE}`)
        .join('')

    const xrefBuffer = Buffer.from(`xref${NEWLINE}0 ${objects.length + 1}${NEWLINE}${xrefEntries}`, 'utf8')
    const trailerBuffer = Buffer.from(
        `trailer${NEWLINE}<< /Size ${objects.length + 1} /Root 1 0 R >>${NEWLINE}startxref${NEWLINE}${position}${NEWLINE}%%EOF${NEWLINE}`,
        'utf8'
    )

    return Buffer.concat([headerBuffer, ...objects, xrefBuffer, trailerBuffer])
}

export default createSimplePdf
