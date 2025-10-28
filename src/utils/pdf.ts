import { Buffer } from 'node:buffer'

const DEFAULT_LINE_WIDTH = 110

const escapePdfText = (input: string) =>
    input
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')

const chunkLine = (line: string): string[] => {
    if (!line) {
        return [' ']
    }

    const normalized = line.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const segments: string[] = []

    normalized.split('\n').forEach(part => {
        if (part.length === 0) {
            segments.push(' ')
            return
        }

        let remaining = part
        while (remaining.length > DEFAULT_LINE_WIDTH) {
            segments.push(remaining.slice(0, DEFAULT_LINE_WIDTH))
            remaining = remaining.slice(DEFAULT_LINE_WIDTH)
        }

        segments.push(remaining)
    })

    return segments
}

export const createSimplePdf = (lines: string[]): Buffer => {
    const sanitizedLines = lines.flatMap(chunkLine).map(segment => escapePdfText(segment))

    const contentParts: string[] = ['BT', '/F1 12 Tf', '12 TL', '1 0 0 1 72 720 Tm']

    if (sanitizedLines.length === 0) {
        contentParts.push('(No content) Tj')
    } else {
        sanitizedLines.forEach((line, index) => {
            if (index === 0) {
                contentParts.push(`(${line}) Tj`)
            } else {
                contentParts.push('T*')
                contentParts.push(`(${line}) Tj`)
            }
        })
    }

    contentParts.push('ET')

    const contentStream = contentParts.join('\n')
    const contentLength = Buffer.byteLength(contentStream, 'utf8')

    const header = '%PDF-1.4\n'
    const objects: string[] = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
        `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    ]

    const offsets: number[] = [0]
    let position = Buffer.byteLength(header, 'utf8')

    objects.forEach(obj => {
        offsets.push(position)
        position += Buffer.byteLength(obj, 'utf8')
    })

    const startXref = position
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`

    for (let i = 1; i < offsets.length; i += 1) {
        const offsetValue = offsets[i] ?? 0
        xref += `${offsetValue.toString().padStart(10, '0')} 00000 n \n`
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`

    const pdfContent = header + objects.join('') + xref + trailer

    return Buffer.from(pdfContent, 'utf8')
}

export default createSimplePdf
