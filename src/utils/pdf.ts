import { Buffer } from 'node:buffer'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const PAGE_MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2

const DEFAULT_LINE_HEIGHT_FACTOR = 1.45

const enum FontKey {
    Regular = 'F1',
    Italic = 'F2',
    Bold = 'F3',
    Mono = 'F4'
}

type RGB = [number, number, number]

const COLORS = {
    textPrimary: [0.07, 0.09, 0.13] as RGB,
    textSecondary: [0.29, 0.34, 0.42] as RGB,
    textMuted: [0.44, 0.48, 0.56] as RGB,
    divider: [0.82, 0.85, 0.9] as RGB,
    tableBorder: [0.74, 0.78, 0.83] as RGB,
    tableHeader: [0.89, 0.92, 0.97] as RGB,
    tableStripe: [0.96, 0.97, 0.99] as RGB,
    codeBackground: [0.95, 0.96, 0.98] as RGB
}

const escapePdfString = (input: string) =>
    input
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const normalizeRatios = (ratios: number[], count: number) => {
    if (ratios.length !== count) {
        return new Array(count).fill(1 / count)
    }

    const positive = ratios.map(value => (value > 0 ? value : 1 / count))
    const total = positive.reduce((acc, value) => acc + value, 0)

    if (total === 0) {
        return new Array(count).fill(1 / count)
    }

    return positive.map(value => value / total)
}

const estimateLineCapacity = (width: number, fontSize: number) => {
    const averageCharWidth = fontSize * 0.52
    const capacity = Math.floor(width / Math.max(averageCharWidth, 1))
    return clamp(capacity, 8, 240)
}

const wrapText = (text: string, width: number, fontSize: number) => {
    const normalized = text.replace(/\s+/g, ' ').trim()

    if (normalized.length === 0) {
        return ['']
    }

    const capacity = estimateLineCapacity(width, fontSize)
    const words = normalized.split(' ')
    const lines: string[] = []
    let current = ''

    const pushCurrent = () => {
        if (current.length > 0) {
            lines.push(current)
            current = ''
        }
    }

    words.forEach(word => {
        if (word.length > capacity) {
            pushCurrent()
            for (let index = 0; index < word.length; index += capacity) {
                lines.push(word.slice(index, index + capacity))
            }
            return
        }

        const candidate = current.length > 0 ? `${current} ${word}` : word

        if (candidate.length <= capacity) {
            current = candidate
        } else {
            pushCurrent()
            current = word
        }
    })

    pushCurrent()

    return lines
}

const toRgbCommand = (color: RGB, operator: 'rg' | 'RG') =>
    `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} ${operator}`

const setLineWidthCommand = (width: number) => `${width.toFixed(2)} w`

class PdfBuilder {
    private pages: string[][] = []
    private currentPage: string[] = []
    private cursorY = 0

    constructor() {
        this.startPage()
    }

    build = () => buildPdfDocument(this.pages)

    addTitle(text: string) {
        this.drawTextBlock(text, {
            font: FontKey.Bold,
            fontSize: 22,
            color: COLORS.textPrimary,
            spacingAfter: 8
        })
    }

    addSubtitle(text: string) {
        this.drawTextBlock(text, {
            font: FontKey.Bold,
            fontSize: 13,
            color: COLORS.textSecondary,
            spacingAfter: 4
        })
    }

    addMetadataLine(text: string) {
        this.drawTextBlock(text, {
            font: FontKey.Regular,
            fontSize: 11,
            color: COLORS.textMuted,
            spacingAfter: 2
        })
    }

    addSpacing(multiplier = 1) {
        const amount = 12 * multiplier

        if (this.cursorY - amount < PAGE_MARGIN) {
            this.startPage()
        }

        this.cursorY -= amount
    }

    addHorizontalRule() {
        const y = this.cursorY - 6
        this.ensureSpace(12)
        this.drawLine(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y, COLORS.divider, 0.8)
        this.cursorY -= 12
    }

    addSectionHeading(text: string) {
        this.drawTextBlock(text, {
            font: FontKey.Bold,
            fontSize: 16,
            color: COLORS.textPrimary,
            spacingBefore: 6,
            spacingAfter: 6
        })
    }

    addSubheading(text: string) {
        this.drawTextBlock(text, {
            font: FontKey.Bold,
            fontSize: 13,
            color: COLORS.textSecondary,
            spacingBefore: 4,
            spacingAfter: 4
        })
    }

    addParagraph(text: string) {
        this.drawWrappedText(text, {
            font: FontKey.Regular,
            fontSize: 11,
            color: COLORS.textPrimary,
            lineHeightFactor: DEFAULT_LINE_HEIGHT_FACTOR,
            spacingAfter: 6
        })
    }

    addNote(text: string) {
        this.drawWrappedText(text, {
            font: FontKey.Italic,
            fontSize: 10.5,
            color: COLORS.textMuted,
            lineHeightFactor: DEFAULT_LINE_HEIGHT_FACTOR,
            spacingAfter: 6
        })
    }

    addKeyValuePairs(items: PdfKeyValuePair[]) {
        if (items.length === 0) {
            this.addNote('Không có dữ liệu để hiển thị')
            return
        }

        this.drawTable({
            columns: ['Field', 'Value'],
            rows: items.map(item => [item.label, item.value]),
            columnRatios: [0.3, 0.7]
        })
    }

    addTable(table: PdfTableContent) {
        if (table.rows.length === 0) {
            if (table.emptyMessage) {
                this.addNote(table.emptyMessage)
            }

            return
        }

        this.drawTable(table)

        if (table.note) {
            this.addNote(table.note)
        }
    }

    addCodeBlock(lines: string[]) {
        if (lines.length === 0) {
            return
        }

        const fontSize = 9.5
        const padding = 10
        const lineHeight = fontSize * DEFAULT_LINE_HEIGHT_FACTOR
        const blockHeight = lineHeight * lines.length + padding * 2

        this.ensureSpace(blockHeight + 6)

        const top = this.cursorY
        const bottom = top - blockHeight

        this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, blockHeight, COLORS.codeBackground)

        let baseline = top - padding - fontSize * 0.2

        lines.forEach(line => {
            this.drawTextAt(line, {
                font: FontKey.Mono,
                fontSize,
                color: COLORS.textPrimary,
                x: PAGE_MARGIN + padding,
                y: baseline
            })
            baseline -= lineHeight
        })

        this.cursorY = bottom - 10
    }

    private drawTable(table: PdfTableContent) {
        const ratios = normalizeRatios(table.columnRatios ?? [], table.columns.length)
        const columnWidths = ratios.map(ratio => ratio * CONTENT_WIDTH)
        const fontSize = 11
        const paddingX = 10
        const paddingY = 6
        const lineHeight = fontSize * DEFAULT_LINE_HEIGHT_FACTOR

        const rows: { cells: string[]; isHeader: boolean }[] = [
            { cells: table.columns, isHeader: true },
            ...table.rows.map(row => ({ cells: row, isHeader: false }))
        ]

        rows.forEach((row, index) => {
            const font = row.isHeader ? FontKey.Bold : FontKey.Regular
            const appliedFontSize = row.isHeader ? fontSize + 0.5 : fontSize
            const cellLineSets = row.cells.map((cell, columnIndex) => {
                const columnWidth = columnWidths[columnIndex] ?? CONTENT_WIDTH / Math.max(table.columns.length, 1)
                const availableWidth = Math.max(columnWidth - paddingX * 2, appliedFontSize)
                return wrapText(cell ?? '', availableWidth, appliedFontSize)
            })
            const maxLines = cellLineSets.reduce((acc, lines) => Math.max(acc, lines.length), 1)
            const rowHeight = maxLines * lineHeight + paddingY * 2

            this.ensureSpace(rowHeight + 6)

            const top = this.cursorY
            const bottom = top - rowHeight

            if (row.isHeader) {
                this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, rowHeight, COLORS.tableHeader)
            } else if (index % 2 === 1) {
                this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, rowHeight, COLORS.tableStripe)
            }

            this.drawLine(PAGE_MARGIN, top, PAGE_MARGIN + CONTENT_WIDTH, top, COLORS.tableBorder, 0.6)
            this.drawLine(PAGE_MARGIN, bottom, PAGE_MARGIN + CONTENT_WIDTH, bottom, COLORS.tableBorder, 0.6)

            let accumulatedWidth = PAGE_MARGIN
            columnWidths.forEach((width, columnIndex) => {
                const columnWidth = width ?? CONTENT_WIDTH / Math.max(table.columns.length, 1)
                this.drawLine(accumulatedWidth, bottom, accumulatedWidth, top, COLORS.tableBorder, 0.6)
                accumulatedWidth += columnWidth
            })
            this.drawLine(accumulatedWidth, bottom, accumulatedWidth, top, COLORS.tableBorder, 0.6)

            let cellStartX = PAGE_MARGIN
            cellLineSets.forEach((lines, columnIndex) => {
                let baseline = top - paddingY - appliedFontSize * 0.2

                lines.forEach(line => {
                    this.drawTextAt(line, {
                        font,
                        fontSize: appliedFontSize,
                        color: COLORS.textPrimary,
                        x: cellStartX + paddingX,
                        y: baseline
                    })
                    baseline -= lineHeight
                })

                const columnWidth = columnWidths[columnIndex] ?? CONTENT_WIDTH / Math.max(table.columns.length, 1)
                cellStartX += columnWidth
            })

            this.cursorY = bottom
        })

        this.cursorY -= 8
    }

    private drawWrappedText(
        text: string,
        options: {
            font: FontKey
            fontSize: number
            color: RGB
            lineHeightFactor: number
            spacingBefore?: number
            spacingAfter?: number
        }
    ) {
        if (text.trim().length === 0) {
            return
        }

        if (options.spacingBefore) {
            this.addSpacing(options.spacingBefore / 12)
        }

        const lines = wrapText(text, CONTENT_WIDTH, options.fontSize)
        const lineHeight = options.fontSize * options.lineHeightFactor

        lines.forEach(line => {
            this.ensureSpace(lineHeight)
            this.drawTextAt(line, {
                font: options.font,
                fontSize: options.fontSize,
                color: options.color,
                x: PAGE_MARGIN,
                y: this.cursorY
            })
            this.cursorY -= lineHeight
        })

        if (options.spacingAfter) {
            this.cursorY -= options.spacingAfter
        }
    }

    private drawTextBlock(
        text: string,
        options: {
            font: FontKey
            fontSize: number
            color: RGB
            spacingBefore?: number
            spacingAfter?: number
        }
    ) {
        if (options.spacingBefore) {
            this.addSpacing(options.spacingBefore / 12)
        }

        this.ensureSpace(options.fontSize * DEFAULT_LINE_HEIGHT_FACTOR)
        this.drawTextAt(text, {
            font: options.font,
            fontSize: options.fontSize,
            color: options.color,
            x: PAGE_MARGIN,
            y: this.cursorY
        })
        this.cursorY -= options.fontSize * DEFAULT_LINE_HEIGHT_FACTOR

        if (options.spacingAfter) {
            this.cursorY -= options.spacingAfter
        }
    }

    private drawTextAt(
        text: string,
        options: { font: FontKey; fontSize: number; color: RGB; x: number; y: number }
    ) {
        this.ensureWithinBounds(options.y)
        this.currentPage.push('BT')
        this.currentPage.push(`/${options.font} ${options.fontSize.toFixed(2)} Tf`)
        this.currentPage.push(toRgbCommand(options.color, 'rg'))
        this.currentPage.push(`1 0 0 1 ${options.x.toFixed(2)} ${options.y.toFixed(2)} Tm`)
        this.currentPage.push(`(${escapePdfString(text)}) Tj`)
        this.currentPage.push('ET')
    }

    private drawLine(x1: number, y1: number, x2: number, y2: number, color: RGB, width: number) {
        this.currentPage.push('q')
        this.currentPage.push(toRgbCommand(color, 'RG'))
        this.currentPage.push(setLineWidthCommand(width))
        this.currentPage.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`)
        this.currentPage.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`)
        this.currentPage.push('S')
        this.currentPage.push('Q')
    }

    private fillRectangle(x: number, y: number, width: number, height: number, color: RGB) {
        this.currentPage.push('q')
        this.currentPage.push(toRgbCommand(color, 'rg'))
        this.currentPage.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`)
        this.currentPage.push('f')
        this.currentPage.push('Q')
    }

    private ensureSpace(requiredHeight: number) {
        if (this.cursorY - requiredHeight < PAGE_MARGIN) {
            this.startPage()
        }
    }

    private ensureWithinBounds(y: number) {
        if (y < PAGE_MARGIN) {
            this.startPage()
        }
    }

    private startPage() {
        this.currentPage = []
        this.pages.push(this.currentPage)
        this.cursorY = PAGE_HEIGHT - PAGE_MARGIN
        this.currentPage.push('0 0 0 rg')
        this.currentPage.push('0 0 0 RG')
        this.currentPage.push('1 w')
    }
}

export interface PdfKeyValuePair {
    label: string
    value: string
}

export interface PdfTableContent {
    columns: string[]
    rows: string[][]
    columnRatios?: number[]
    note?: string | null
    emptyMessage?: string | null
}

export interface PdfEvidenceSection {
    title: string
    summary: PdfKeyValuePair[]
    table: PdfTableContent | null
    note?: string | null
}

export interface DossierPdfContent {
    disputeId: string
    status: string
    version: number
    generatedAt: string
    generatedBy: string
    lockedAt?: string | null
    finalizedAt?: string | null
    caseOverview: PdfKeyValuePair[]
    metadataOverview?: {
        items: PdfKeyValuePair[] | null
        note?: string | null
    } | null
    parties?: PdfTableContent | null
    financialOverview: {
        summary: PdfKeyValuePair[]
        requested?: PdfTableContent | null
        decided?: PdfTableContent | null
    }
    timeline?: PdfTableContent | null
    evidenceSections: PdfEvidenceSection[]
    evidenceNote?: string | null
    payloadSnapshot?: {
        lines: string[]
        note?: string | null
    } | null
    payloadFallback?: string | null
}

const buildPdfDocument = (pages: string[][]) => {
    if (pages.length === 0) {
        pages.push(['BT', '/F1 12 Tf', `1 0 0 1 ${PAGE_MARGIN} ${PAGE_HEIGHT - PAGE_MARGIN} Tm`, '(No content) Tj', 'ET'])
    }

    const headerBuffer = Buffer.from(`%PDF-1.4\n%âãÏÓ\n`, 'utf8')

    const pageCount = pages.length
    const pageObjectIds: number[] = []
    const contentObjectIds: number[] = []
    let nextId = 3

    for (let index = 0; index < pageCount; index += 1) {
        pageObjectIds.push(nextId)
        nextId += 1
    }

    for (let index = 0; index < pageCount; index += 1) {
        contentObjectIds.push(nextId)
        nextId += 1
    }

    const fontIds = {
        [FontKey.Regular]: nextId,
        [FontKey.Italic]: nextId + 1,
        [FontKey.Bold]: nextId + 2,
        [FontKey.Mono]: nextId + 3
    } as const

    nextId += 4

    const objects: { id: number; buffer: Buffer }[] = []

    const kids = pageObjectIds.map(id => `${id} 0 R`).join(' ')

    objects.push({
        id: 2,
        buffer: Buffer.from(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`, 'utf8')
    })

    objects.push({
        id: 1,
        buffer: Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', 'utf8')
    })

    pages.forEach((commands, index) => {
        const pageId = pageObjectIds[index]!
        const contentId = contentObjectIds[index]!
        const resources = `<< /Font << /${FontKey.Regular} ${fontIds[FontKey.Regular]} 0 R /${FontKey.Italic} ${fontIds[FontKey.Italic]} 0 R /${FontKey.Bold} ${fontIds[FontKey.Bold]} 0 R /${FontKey.Mono} ${fontIds[FontKey.Mono]} 0 R >> >>`
        const buffer = Buffer.from(
            `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources ${resources} /Contents ${contentId} 0 R >>\nendobj\n`,
            'utf8'
        )
        objects.push({ id: pageId, buffer })
    })

    pages.forEach((commands, index) => {
        const contentId = contentObjectIds[index]!
        const stream = commands.join('\n')
        const streamBuffer = Buffer.from(stream, 'utf8')
        const buffer = Buffer.concat([
            Buffer.from(`${contentId} 0 obj\n<< /Length ${streamBuffer.length} >>\nstream\n`, 'utf8'),
            streamBuffer,
            Buffer.from(`\nendstream\nendobj\n`, 'utf8')
        ])
        objects.push({ id: contentId, buffer })
    })

    objects.push({
        id: fontIds[FontKey.Regular],
        buffer: Buffer.from(
            `${fontIds[FontKey.Regular]} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
            'utf8'
        )
    })

    objects.push({
        id: fontIds[FontKey.Italic],
        buffer: Buffer.from(
            `${fontIds[FontKey.Italic]} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n`,
            'utf8'
        )
    })

    objects.push({
        id: fontIds[FontKey.Bold],
        buffer: Buffer.from(
            `${fontIds[FontKey.Bold]} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
            'utf8'
        )
    })

    objects.push({
        id: fontIds[FontKey.Mono],
        buffer: Buffer.from(
            `${fontIds[FontKey.Mono]} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`,
            'utf8'
        )
    })

    objects.sort((a, b) => a.id - b.id)

    const buffers = objects.map(entry => entry.buffer)

    const offsets: number[] = [0]
    let position = headerBuffer.length

    buffers.forEach(buffer => {
        offsets.push(position)
        position += buffer.length
    })

    const xrefEntries = offsets
        .map((offset, index) =>
            index === 0 ? '0000000000 65535 f ' : `${offset.toString().padStart(10, '0')} 00000 n `
        )
        .map(entry => `${entry}\n`)
        .join('')

    const xrefBuffer = Buffer.from(`xref\n0 ${buffers.length + 1}\n${xrefEntries}`, 'utf8')
    const trailerBuffer = Buffer.from(
        `trailer\n<< /Size ${buffers.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`,
        'utf8'
    )

    return Buffer.concat([headerBuffer, ...buffers, xrefBuffer, trailerBuffer])
}

const renderDossierPdf = (content: DossierPdfContent): Buffer => {
    const builder = new PdfBuilder()

    builder.addTitle('Arbitration Dossier Report')
    builder.addSubtitle(`Dispute ${content.disputeId}`)
    builder.addMetadataLine(`Status: ${content.status}`)
    builder.addMetadataLine(`Version ${content.version}`)
    builder.addMetadataLine(`Generated at: ${content.generatedAt}`)
    builder.addMetadataLine(`Generated by: ${content.generatedBy}`)

    if (content.lockedAt) {
        builder.addMetadataLine(`Locked at: ${content.lockedAt}`)
    }

    if (content.finalizedAt) {
        builder.addMetadataLine(`Finalized at: ${content.finalizedAt}`)
    }

    builder.addSpacing(0.8)
    builder.addHorizontalRule()

    builder.addSectionHeading('Case Overview')
    builder.addKeyValuePairs(content.caseOverview)

    if (content.metadataOverview) {
        builder.addSectionHeading('Metadata Overview')

        if (content.metadataOverview.items && content.metadataOverview.items.length > 0) {
            builder.addKeyValuePairs(content.metadataOverview.items)
        } else {
            builder.addNote(content.metadataOverview.note ?? 'Không có metadata trong payload')
        }
    }

    builder.addSectionHeading('Parties Involved')

    if (content.parties) {
        builder.addTable(content.parties)
    } else {
        builder.addNote('Không có thông tin đối tác trong payload')
    }

    builder.addSectionHeading('Financial Overview')
    builder.addKeyValuePairs(content.financialOverview.summary)

    if (content.financialOverview.requested) {
        builder.addSubheading('Requested Awards')
        builder.addTable(content.financialOverview.requested)
    }

    if (content.financialOverview.decided) {
        builder.addSubheading('Decided Awards')
        builder.addTable(content.financialOverview.decided)
    }

    builder.addSectionHeading('Timeline (tối đa 40 mốc)')

    if (content.timeline) {
        builder.addTable(content.timeline)
    } else {
        builder.addNote('Không có dữ liệu timeline trong payload')
    }

    builder.addSectionHeading('Evidence Submissions')

    if (content.evidenceSections.length === 0) {
        builder.addNote('Không có bằng chứng trong payload')
    } else {
        content.evidenceSections.forEach(section => {
            builder.addSubheading(section.title)

            if (section.summary.length > 0) {
                builder.addKeyValuePairs(section.summary)
            }

            if (section.table) {
                builder.addTable(section.table)
            }

            if (section.note) {
                builder.addNote(section.note)
            }
        })
    }

    if (content.evidenceNote) {
        builder.addNote(content.evidenceNote)
    }

    builder.addSectionHeading('Payload Snapshot (JSON, giới hạn 200 dòng)')

    if (content.payloadSnapshot) {
        builder.addCodeBlock(content.payloadSnapshot.lines)

        if (content.payloadSnapshot.note) {
            builder.addNote(content.payloadSnapshot.note)
        }
    } else if (content.payloadFallback) {
        builder.addParagraph(content.payloadFallback)
    } else {
        builder.addNote('Payload không khả dụng để hiển thị')
    }

    return builder.build()
}

export default renderDossierPdf
