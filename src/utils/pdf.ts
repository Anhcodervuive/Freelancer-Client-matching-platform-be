import { Buffer } from 'node:buffer'

const DEFAULT_LINE_WIDTH = 110

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

const encodeUtf16BeHex = (input: string): string => {
    const bytes: number[] = [0xfe, 0xff]

    for (let i = 0; i < input.length; i += 1) {
        const codePoint = input.codePointAt(i)

        if (codePoint === undefined) {
            continue
        }

        if (codePoint > 0xffff) {
            const adjusted = codePoint - 0x10000
            const highSurrogate = 0xd800 + ((adjusted >> 10) & 0x3ff)
            const lowSurrogate = 0xdc00 + (adjusted & 0x3ff)

            bytes.push((highSurrogate >> 8) & 0xff, highSurrogate & 0xff)
            bytes.push((lowSurrogate >> 8) & 0xff, lowSurrogate & 0xff)
            i += 1
        } else {
            bytes.push((codePoint >> 8) & 0xff, codePoint & 0xff)
        }
    }

    return Buffer.from(bytes).toString('hex').toUpperCase()
}

export const createSimplePdf = (lines: string[]): Buffer => {
    const segmentedLines = lines.flatMap(chunkLine)

    const contentParts: string[] = ['BT', '/F1 12 Tf', '12 TL', '1 0 0 1 72 720 Tm']

    if (segmentedLines.length === 0) {
        const emptyHex = encodeUtf16BeHex('No content')
        contentParts.push(`<${emptyHex}> Tj`)
    } else {
        segmentedLines.forEach((line, index) => {
            const printable = line ?? ' '
            const hexValue = encodeUtf16BeHex(printable)

            if (index === 0) {
                contentParts.push(`<${hexValue}> Tj`)
            } else {
                contentParts.push('T*')
                contentParts.push(`<${hexValue}> Tj`)
            }
        })
    }

    contentParts.push('ET')

    const contentStream = contentParts.join('\n')
    const contentLength = Buffer.byteLength(contentStream, 'utf8')

    const header = '%PDF-1.4\n%âãÏÓ\n'
    const objects: string[] = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
        `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
        '5 0 obj\n<< /Type /Font /Subtype /Type0 /BaseFont /Helvetica /Encoding /Identity-H /DescendantFonts [6 0 R] >>\nendobj\n',
        '6 0 obj\n<< /Type /Font /Subtype /CIDFontType0 /BaseFont /Helvetica /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 7 0 R /DW 1000 /CIDToGIDMap /Identity >>\nendobj\n',
        '7 0 obj\n<< /Type /FontDescriptor /FontName /Helvetica /Flags 32 /ItalicAngle 0 /Ascent 718 /Descent -207 /CapHeight 718 /AvgWidth 523 /MaxWidth 1000 /FontBBox [-166 -225 1000 931] /StemV 88 >>\nendobj\n'
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

    return Buffer.from(pdfContent, 'binary')
}

export default createSimplePdf
