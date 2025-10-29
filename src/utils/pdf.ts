import { Buffer } from 'node:buffer'
import { TextDecoder } from 'node:util'

import { getFontBuffer } from './pdf-font-data'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const PAGE_MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2

const DEFAULT_LINE_HEIGHT_FACTOR = 1.48

const enum FontKey {
	Regular = 'F1',
	Italic = 'F2',
	Bold = 'F3',
	Mono = 'F4'
}

type RGB = [number, number, number]

const COLORS = {
	textPrimary: [0.1, 0.12, 0.16] as RGB,
	textSecondary: [0.33, 0.38, 0.46] as RGB,
	textMuted: [0.52, 0.56, 0.63] as RGB,
	divider: [0.8, 0.83, 0.88] as RGB,
	tableBorder: [0.72, 0.76, 0.81] as RGB,
	tableHeader: [0.89, 0.92, 0.97] as RGB,
	tableStripe: [0.96, 0.97, 0.99] as RGB,
	codeBackground: [0.94, 0.95, 0.98] as RGB
}

const FONT_FILES = {
	[FontKey.Regular]: 'DejaVuSans.ttf',
	[FontKey.Italic]: 'DejaVuSans-Oblique.ttf',
	[FontKey.Bold]: 'DejaVuSans-Bold.ttf',
	[FontKey.Mono]: 'DejaVuSansMono.ttf'
} as const

const utf16Decoder = new TextDecoder('utf-16be')

const readUInt16 = (buffer: Buffer, offset: number) => buffer.readUInt16BE(offset)
const readInt16 = (buffer: Buffer, offset: number) => buffer.readInt16BE(offset)
const readUInt32 = (buffer: Buffer, offset: number) => buffer.readUInt32BE(offset)
const readInt32 = (buffer: Buffer, offset: number) => buffer.readInt32BE(offset)
const readFixed = (buffer: Buffer, offset: number) => readInt32(buffer, offset) / 65536

interface TableEntry {
	offset: number
	length: number
}

interface CmapSegment {
	start: number
	end: number
	delta: number
	rangeOffset: number
}

interface CmapFormat4 {
	format: 4
	segments: CmapSegment[]
	idRangeOffsetOffset: number
	glyphIndexArrayOffset: number
	glyphIndexArrayLength: number
}

interface CmapGroup {
	start: number
	end: number
	glyphStart: number
}

interface CmapFormat12 {
	format: 12
	groups: CmapGroup[]
}

type CmapData = CmapFormat4 | CmapFormat12
class TrueTypeFont {
	private readonly buffer: Buffer
	private readonly tables: Map<string, TableEntry>
	private readonly cmap: CmapData

	readonly unitsPerEm: number
	readonly ascent: number
	readonly descent: number
	readonly capHeight: number
	readonly xHeight: number
	readonly italicAngle: number
	readonly isMonospace: boolean
	readonly weightClass: number
	readonly avgCharWidth: number
	readonly bbox: { xMin: number; yMin: number; xMax: number; yMax: number }
	readonly postScriptName: string

	private readonly advanceWidths: number[]
	private readonly fallbackGlyphId: number

	constructor(data: Buffer) {
		this.buffer = data
		this.tables = this.parseTableDirectory()

		const head = this.expectTable('head')
		const rawUnits = readUInt16(this.buffer, head.offset + 18)
		this.unitsPerEm = rawUnits > 0 ? rawUnits : 1000
		const xMin = readInt16(this.buffer, head.offset + 36)
		const yMin = readInt16(this.buffer, head.offset + 38)
		const xMax = readInt16(this.buffer, head.offset + 40)
		const yMax = readInt16(this.buffer, head.offset + 42)
		this.bbox = { xMin, yMin, xMax, yMax }

		const hhea = this.expectTable('hhea')
		let ascent = readInt16(this.buffer, hhea.offset + 4)
		let descent = readInt16(this.buffer, hhea.offset + 6)
		const numberOfHMetrics = readUInt16(this.buffer, hhea.offset + 34)

		const maxp = this.expectTable('maxp')
		const numGlyphs = readUInt16(this.buffer, maxp.offset + 4)

		const hmtx = this.expectTable('hmtx')
		this.advanceWidths = this.parseHmtx(hmtx.offset, numberOfHMetrics, numGlyphs)

		let capHeight = Math.round(ascent * 0.7)
		let xHeight = Math.round(ascent * 0.5)
		let weightClass = 400
		let avgCharWidth = Math.round(this.unitsPerEm * 0.5)

		const os2 = this.tables.get('OS/2') ?? null
		if (os2) {
			weightClass = readUInt16(this.buffer, os2.offset + 4)
			avgCharWidth = readInt16(this.buffer, os2.offset + 2)
			const typoAscender = readInt16(this.buffer, os2.offset + 68)
			const typoDescender = readInt16(this.buffer, os2.offset + 70)
			const sxHeight = os2.length >= 90 ? readInt16(this.buffer, os2.offset + 86) : 0
			const sCapHeight = os2.length >= 92 ? readInt16(this.buffer, os2.offset + 88) : 0
			if (typoAscender !== 0) {
				ascent = typoAscender
			}
			if (typoDescender !== 0) {
				descent = typoDescender
			}
			if (sxHeight !== 0) {
				xHeight = sxHeight
			}
			if (sCapHeight !== 0) {
				capHeight = sCapHeight
			}
		}

		this.ascent = ascent
		this.descent = descent
		this.capHeight = capHeight
		this.xHeight = xHeight
		this.weightClass = weightClass
		this.avgCharWidth = avgCharWidth

		const post = this.tables.get('post') ?? null
		if (post) {
			this.italicAngle = readFixed(this.buffer, post.offset + 4)
			this.isMonospace = readUInt32(this.buffer, post.offset + 12) !== 0
		} else {
			this.italicAngle = 0
			this.isMonospace = false
		}

		this.postScriptName = this.parsePostScriptName()

		this.cmap = this.parseCmap()
		const fallback = this.getGlyphIdFromCmap('?'.codePointAt(0) ?? 63)
		this.fallbackGlyphId = fallback ?? 0
	}

	private parseTableDirectory() {
		const numTables = readUInt16(this.buffer, 4)
		const map = new Map<string, TableEntry>()
		let offset = 12
		for (let index = 0; index < numTables; index += 1) {
			const tag = this.buffer.toString('ascii', offset, offset + 4)
			const tableOffset = readUInt32(this.buffer, offset + 8)
			const length = readUInt32(this.buffer, offset + 12)
			map.set(tag, { offset: tableOffset, length })
			offset += 16
		}
		return map
	}

	private expectTable(tag: string) {
		const entry = this.tables.get(tag)
		if (!entry) {
			throw new Error(`Missing ${tag} table in font`)
		}
		return entry
	}

	private parseHmtx(offset: number, numberOfHMetrics: number, numGlyphs: number) {
		const widths: number[] = []
		let cursor = offset
		for (let index = 0; index < numberOfHMetrics; index += 1) {
			widths.push(readUInt16(this.buffer, cursor))
			cursor += 4
		}
		const lastWidth = widths.length > 0 ? widths[widths.length - 1]! : this.unitsPerEm
		while (widths.length < numGlyphs) {
			widths.push(lastWidth)
		}
		return widths
	}

	private parsePostScriptName() {
		const nameEntry = this.tables.get('name')
		if (!nameEntry) {
			return 'EmbeddedFont'
		}
		const count = readUInt16(this.buffer, nameEntry.offset + 2)
		const stringOffset = readUInt16(this.buffer, nameEntry.offset + 4)
		let best: string | null = null
		for (let index = 0; index < count; index += 1) {
			const recordOffset = nameEntry.offset + 6 + index * 12
			const platformId = readUInt16(this.buffer, recordOffset)
			const nameId = readUInt16(this.buffer, recordOffset + 6)
			const length = readUInt16(this.buffer, recordOffset + 8)
			const offset = readUInt16(this.buffer, recordOffset + 10)
			if (nameId !== 6) {
				continue
			}
			const start = nameEntry.offset + stringOffset + offset
			const end = start + length
			let value: string
			if (platformId === 0 || platformId === 3) {
				value = utf16Decoder.decode(this.buffer.subarray(start, end))
			} else {
				value = this.buffer.toString('ascii', start, end)
			}
			value = value.replace(/[^A-Za-z0-9\-]/g, '')
			if (value.length > 0) {
				best = value
				break
			}
		}
		return best ?? 'EmbeddedFont'
	}

	private parseCmap(): CmapData {
		const cmapEntry = this.expectTable('cmap')
		const cmapOffset = cmapEntry.offset
		const numTables = readUInt16(this.buffer, cmapOffset + 2)
		let format12Offset: number | null = null
		let format4Offset: number | null = null
		for (let index = 0; index < numTables; index += 1) {
			const recordOffset = cmapOffset + 4 + index * 8
			const platformId = readUInt16(this.buffer, recordOffset)
			const encodingId = readUInt16(this.buffer, recordOffset + 2)
			const subtableOffset = readUInt32(this.buffer, recordOffset + 4)
			const tableStart = cmapOffset + subtableOffset
			const format = readUInt16(this.buffer, tableStart)
			if (format === 12 && platformId === 3 && (encodingId === 10 || encodingId === 1)) {
				format12Offset = tableStart
				break
			}
			if (format === 4 && format4Offset === null && platformId === 3) {
				format4Offset = tableStart
			}
			if (format === 4 && format4Offset === null && platformId === 0) {
				format4Offset = tableStart
			}
		}

		if (format12Offset !== null) {
			const nGroups = readUInt32(this.buffer, format12Offset + 12)
			const groups: CmapGroup[] = []
			let cursor = format12Offset + 16
			for (let index = 0; index < nGroups; index += 1) {
				const startChar = readUInt32(this.buffer, cursor)
				const endChar = readUInt32(this.buffer, cursor + 4)
				const glyphStart = readUInt32(this.buffer, cursor + 8)
				groups.push({ start: startChar, end: endChar, glyphStart })
				cursor += 12
			}
			return { format: 12, groups }
		}

		if (format4Offset === null) {
			throw new Error('Font does not contain a supported cmap subtable')
		}

		const length = readUInt16(this.buffer, format4Offset + 2)
		const segCount = readUInt16(this.buffer, format4Offset + 6) / 2
		const endCodeOffset = format4Offset + 14
		const startCodeOffset = endCodeOffset + segCount * 2 + 2
		const idDeltaOffset = startCodeOffset + segCount * 2
		const idRangeOffsetOffset = idDeltaOffset + segCount * 2
		const glyphIndexArrayOffset = idRangeOffsetOffset + segCount * 2
		const glyphIndexArrayLength = length - (glyphIndexArrayOffset - format4Offset)

		const segments: CmapSegment[] = []
		for (let index = 0; index < segCount; index += 1) {
			const end = readUInt16(this.buffer, endCodeOffset + index * 2)
			const start = readUInt16(this.buffer, startCodeOffset + index * 2)
			const delta = readInt16(this.buffer, idDeltaOffset + index * 2)
			const rangeOffset = readUInt16(this.buffer, idRangeOffsetOffset + index * 2)
			segments.push({ start, end, delta, rangeOffset })
		}

		return {
			format: 4,
			segments,
			idRangeOffsetOffset,
			glyphIndexArrayOffset,
			glyphIndexArrayLength
		}
	}

	private getGlyphIdFromCmap(codePoint: number): number | null {
		if (this.cmap.format === 12) {
			const groups = this.cmap.groups
			let low = 0
			let high = groups.length - 1
			while (low <= high) {
				const mid = Math.floor((low + high) / 2)
				const group = groups[mid]!
				if (codePoint < group.start) {
					high = mid - 1
				} else if (codePoint > group.end) {
					low = mid + 1
				} else {
					return group.glyphStart + (codePoint - group.start)
				}
			}
			return null
		}

		const segments = this.cmap.segments
		for (let index = 0; index < segments.length; index += 1) {
			const segment = segments[index]!
			if (codePoint < segment.start || codePoint > segment.end) {
				continue
			}
			if (segment.rangeOffset === 0) {
				return (codePoint + segment.delta) & 0xffff
			}
			const offset = this.cmap.idRangeOffsetOffset + index * 2 + segment.rangeOffset + (codePoint - segment.start) * 2
			if (
				offset < this.cmap.glyphIndexArrayOffset ||
				offset >= this.cmap.glyphIndexArrayOffset + this.cmap.glyphIndexArrayLength
			) {
				return null
			}
			const glyphIndex = this.buffer.readUInt16BE(offset)
			if (glyphIndex === 0) {
				return null
			}
			return (glyphIndex + segment.delta) & 0xffff
		}
		return null
	}

	getGlyphId(codePoint: number) {
		const glyph = this.getGlyphIdFromCmap(codePoint)
		if (glyph !== null && glyph !== undefined) {
			return glyph
		}
		return this.fallbackGlyphId
	}

	getAdvanceWidthByGlyphId(glyphId: number) {
		return this.advanceWidths[glyphId] ?? this.advanceWidths[0] ?? this.unitsPerEm
	}

	getAdvanceWidthByCodePoint(codePoint: number) {
		const glyphId = this.getGlyphId(codePoint)
		return this.getAdvanceWidthByGlyphId(glyphId)
	}

	getFontData() {
		return this.buffer
	}
}
interface FontGlyph {
	cid: number
	glyphId: number
	width: number
	codePoint: number
}

class EmbeddedFont {
	private readonly font: TrueTypeFont
	private readonly charMap = new Map<string, FontGlyph>()
	private readonly cidMap = new Map<number, FontGlyph>()
	private nextCid = 1
	private widthSum = 0
	private maxWidth = 0

	constructor(readonly key: FontKey, font: TrueTypeFont, private readonly isItalicStyle: boolean) {
		this.font = font
	}

	ensureGlyph(char: string, codePoint: number) {
		const existing = this.charMap.get(char)
		if (existing) {
			return existing
		}
		const glyphId = this.font.getGlyphId(codePoint)
		const width = this.font.getAdvanceWidthByGlyphId(glyphId)
		const cid = this.nextCid
		this.nextCid += 1
		const entry: FontGlyph = { cid, glyphId, width, codePoint }
		this.charMap.set(char, entry)
		this.cidMap.set(cid, entry)
		this.widthSum += width
		if (width > this.maxWidth) {
			this.maxWidth = width
		}
		return entry
	}

	encodeText(text: string) {
		const characters = Array.from(text)
		if (characters.length === 0) {
			return '<>'
		}
		const parts: string[] = []
		characters.forEach(char => {
			const codePoint = char.codePointAt(0) ?? 32
			const glyph = this.ensureGlyph(char, codePoint)
			parts.push(glyph.cid.toString(16).padStart(4, '0'))
		})
		return `<${parts.join('')}>`
	}

	measureText(text: string, fontSize: number) {
		const characters = Array.from(text)
		if (characters.length === 0) {
			return 0
		}
		let totalWidth = 0
		characters.forEach(char => {
			const codePoint = char.codePointAt(0) ?? 32
			const glyph = this.ensureGlyph(char, codePoint)
			totalWidth += glyph.width
		})
		return (totalWidth / this.font.unitsPerEm) * fontSize
	}

	get hasGlyphs() {
		return this.cidMap.size > 0
	}

	buildFontObjects(startId: number) {
		const objects: { id: number; buffer: Buffer }[] = []
		const type0Id = startId
		const cidFontId = startId + 1
		const descriptorId = startId + 2
		const fontFileId = startId + 3
		const cidToGidId = startId + 4
		const toUnicodeId = startId + 5
		const baseName = `${this.font.postScriptName}-${this.key}`

		const descriptor = this.buildFontDescriptor(descriptorId, fontFileId, baseName)
		objects.push({ id: descriptorId, buffer: descriptor })

		const fontData = this.font.getFontData()
		objects.push({
			id: fontFileId,
			buffer: Buffer.concat([
				Buffer.from(`${fontFileId} 0 obj\n<< /Length ${fontData.length} /Length1 ${fontData.length} >>\nstream\n`),
				fontData,
				Buffer.from(`\nendstream\nendobj\n`)
			])
		})

		const cidToGidMap = this.buildCidToGidMap()
		objects.push({
			id: cidToGidId,
			buffer: Buffer.concat([
				Buffer.from(`${cidToGidId} 0 obj\n<< /Length ${cidToGidMap.length} >>\nstream\n`),
				cidToGidMap,
				Buffer.from(`\nendstream\nendobj\n`)
			])
		})

		const toUnicode = this.buildToUnicodeCMap()
		objects.push({
			id: toUnicodeId,
			buffer: Buffer.concat([
				Buffer.from(`${toUnicodeId} 0 obj\n<< /Length ${toUnicode.length} >>\nstream\n`),
				toUnicode,
				Buffer.from(`\nendstream\nendobj\n`)
			])
		})

		const cidFontDict = `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${baseName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptorId} 0 R /DW 1000 /W ${this.buildWidthArray()} /CIDToGIDMap ${cidToGidId} 0 R >>`
		objects.push({ id: cidFontId, buffer: Buffer.from(`${cidFontId} 0 obj\n${cidFontDict}\nendobj\n`) })

		const type0Dict = `<< /Type /Font /Subtype /Type0 /BaseFont /${baseName} /Encoding /Identity-H /DescendantFonts [${cidFontId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`
		objects.push({ id: type0Id, buffer: Buffer.from(`${type0Id} 0 obj\n${type0Dict}\nendobj\n`) })

		return { objects, type0Id }
	}

	private buildFontDescriptor(descriptorId: number, fontFileId: number, baseName: string) {
		const scale = (value: number) => Math.round((value / this.font.unitsPerEm) * 1000)
		const bbox = [
			scale(this.font.bbox.xMin),
			scale(this.font.bbox.yMin),
			scale(this.font.bbox.xMax),
			scale(this.font.bbox.yMax)
		]
		const ascent = scale(this.font.ascent)
		const descent = scale(this.font.descent)
		const capHeight = scale(this.font.capHeight)
		const xHeight = scale(this.font.xHeight)
		const avgWidthUnits = this.cidMap.size > 0 ? Math.round(this.widthSum / this.cidMap.size) : this.font.avgCharWidth
		const avgWidth = scale(avgWidthUnits)
		const maxWidth = scale(this.maxWidth || this.font.unitsPerEm)
		let flags = 16
		if (this.font.isMonospace) {
			flags |= 1
		}
		if (this.isItalicStyle || this.font.italicAngle !== 0) {
			flags |= 32
		}
		if (this.font.weightClass >= 600) {
			flags |= 256
		}
		const stemV = this.font.weightClass >= 600 ? 120 : 80
		const descriptor = `<< /Type /FontDescriptor /FontName /${baseName} /Flags ${flags} /FontBBox [${bbox.join(
			' '
		)}] /ItalicAngle ${this.font.italicAngle.toFixed(
			2
		)} /Ascent ${ascent} /Descent ${descent} /CapHeight ${capHeight} /XHeight ${xHeight} /StemV ${stemV} /AvgWidth ${avgWidth} /MaxWidth ${maxWidth} /FontFile2 ${fontFileId} 0 R >>`
		return Buffer.from(`${descriptorId} 0 obj\n${descriptor}\nendobj\n`)
	}

	private buildCidToGidMap() {
		const maxCid = Math.max(0, ...Array.from(this.cidMap.keys()))
		const buffer = Buffer.alloc((maxCid + 1) * 2)
		this.cidMap.forEach((glyph, cid) => {
			buffer.writeUInt16BE(glyph.glyphId & 0xffff, cid * 2)
		})
		return buffer
	}

	private buildToUnicodeCMap() {
		const entries = Array.from(this.cidMap.values()).sort((a, b) => a.cid - b.cid)
		if (entries.length === 0) {
			const minimal = [
				'/CIDInit /ProcSet findresource begin',
				'12 dict begin',
				'begincmap',
				'/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
				'/CMapName /Adobe-Identity-UCS def',
				'/CMapType 2 def',
				'1 begincodespacerange',
				'<0000> <FFFF>',
				'endcodespacerange',
				'0 beginbfchar',
				'endbfchar',
				'endcmap',
				'CMapName currentdict /CMap defineresource pop',
				'end',
				'end'
			]
			return Buffer.from(minimal.join('\n'), 'utf8')
		}
		const lines: string[] = []
		for (let index = 0; index < entries.length; index += 100) {
			const chunk = entries.slice(index, index + 100)
			lines.push(`${chunk.length} beginbfchar`)
			chunk.forEach(entry => {
				const cidHex = entry.cid.toString(16).padStart(4, '0')
				const unicodeHex = entry.codePoint.toString(16).padStart(entry.codePoint > 0xffff ? 6 : 4, '0')
				lines.push(`<${cidHex}> <${unicodeHex}>`)
			})
			lines.push('endbfchar')
		}
		const cmap = [
			'/CIDInit /ProcSet findresource begin',
			'12 dict begin',
			'begincmap',
			'/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
			'/CMapName /Adobe-Identity-UCS def',
			'/CMapType 2 def',
			'1 begincodespacerange',
			'<0000> <FFFF>',
			'endcodespacerange',
			...lines,
			'endcmap',
			'CMapName currentdict /CMap defineresource pop',
			'end',
			'end'
		]
		return Buffer.from(cmap.join('\n'), 'utf8')
	}

	private buildWidthArray() {
		if (this.cidMap.size === 0) {
			return '[]'
		}
		const scale = (value: number) => Math.round((value / this.font.unitsPerEm) * 1000)
		const entries = Array.from(this.cidMap.values()).sort((a, b) => a.cid - b.cid)
		const parts: string[] = []
		let currentStart = entries[0]!.cid
		let lastCid = currentStart
		let widths: number[] = [scale(entries[0]!.width)]
		for (let index = 1; index < entries.length; index += 1) {
			const glyph = entries[index]!
			const cid = glyph.cid
			const width = scale(glyph.width)
			if (cid === lastCid + 1) {
				widths.push(width)
				lastCid = cid
			} else {
				parts.push(`${currentStart} [${widths.join(' ')}]`)
				currentStart = cid
				lastCid = cid
				widths = [width]
			}
		}
		parts.push(`${currentStart} [${widths.join(' ')}]`)
		return `[${parts.join(' ')}]`
	}
}
const fontCache = new Map<string, TrueTypeFont>()

const loadFont = (fileName: string) => {
	const cached = fontCache.get(fileName)
	if (cached) {
		return cached
	}
	const font = new TrueTypeFont(getFontBuffer(fileName))
	fontCache.set(fileName, font)
	return font
}

const toRgbCommand = (color: RGB, operator: 'rg' | 'RG') =>
	`${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} ${operator}`

const setLineWidthCommand = (width: number) => `${width.toFixed(2)} w`

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

const wrapText = (text: string, width: number, font: EmbeddedFont, fontSize: number) => {
	if (width <= 0) {
		return [text]
	}

	const normalized = text.replace(/\r\n/g, '\n')
	const tokens = normalized.split(/(\n)/)
	const lines: string[] = []
	const spaceWidth = font.measureText(' ', fontSize)

	let currentLine = ''
	let currentWidth = 0

	const commitLine = () => {
		lines.push(currentLine)
		currentLine = ''
		currentWidth = 0
	}

	const splitLongWord = (word: string) => {
		let segment = ''
		let segmentWidth = 0
		Array.from(word).forEach(char => {
			const charWidth = font.measureText(char, fontSize)
			if (segment.length > 0 && segmentWidth + charWidth > width) {
				lines.push(segment)
				segment = char
				segmentWidth = charWidth
			} else {
				segment += char
				segmentWidth += charWidth
			}
		})
		currentLine = segment
		currentWidth = segmentWidth
	}

	tokens.forEach(token => {
		if (token === '\n') {
			commitLine()
			return
		}

		const trimmed = token.trim()
		if (trimmed.length === 0) {
			return
		}

		const words = trimmed.split(/\s+/)
		words.forEach(word => {
			const wordWidth = font.measureText(word, fontSize)

			if (wordWidth > width) {
				commitLine()
				splitLongWord(word)
				return
			}

			if (currentLine.length === 0) {
				currentLine = word
				currentWidth = wordWidth
				return
			}

			if (currentWidth + spaceWidth + wordWidth <= width) {
				currentLine = `${currentLine} ${word}`
				currentWidth += spaceWidth + wordWidth
			} else {
				commitLine()
				currentLine = word
				currentWidth = wordWidth
			}
		})
	})

	if (currentLine.length > 0 || lines.length === 0) {
		commitLine()
	}

	return lines
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
	milestone?: {
		details: PdfKeyValuePair[] | null
		note?: string | null
	} | null
	milestoneSubmissions?: {
		table: PdfTableContent | null
		note?: string | null
	} | null
	timeline?: PdfTableContent | null
	evidenceSections: PdfEvidenceSection[]
	evidenceNote?: string | null
	payloadSnapshot?: {
		lines: string[]
		note?: string | null
	} | null
	payloadFallback?: string | null
}
class PdfBuilder {
	private pages: string[][] = []
	private currentPage: string[] = []
	private cursorY = 0
	private readonly fonts: Record<FontKey, EmbeddedFont>

	constructor() {
		this.fonts = {
			[FontKey.Regular]: new EmbeddedFont(FontKey.Regular, loadFont(FONT_FILES[FontKey.Regular]), false),
			[FontKey.Italic]: new EmbeddedFont(FontKey.Italic, loadFont(FONT_FILES[FontKey.Italic]), true),
			[FontKey.Bold]: new EmbeddedFont(FontKey.Bold, loadFont(FONT_FILES[FontKey.Bold]), false),
			[FontKey.Mono]: new EmbeddedFont(FontKey.Mono, loadFont(FONT_FILES[FontKey.Mono]), false)
		}
		this.startPage()
	}

	build() {
		return buildPdfDocument(this.pages, Object.values(this.fonts))
	}

	addTitle(text: string) {
		this.drawTextBlock(text, {
			font: FontKey.Bold,
			fontSize: 22,
			color: COLORS.textPrimary,
			spacingAfter: 6,
			align: 'center'
		})
	}

	addSubtitle(text: string) {
		this.drawTextBlock(text, {
			font: FontKey.Bold,
			fontSize: 12.5,
			color: COLORS.textSecondary,
			spacingAfter: 10,
			align: 'center'
		})
	}

	addMetadataLine(text: string) {
		this.drawTextBlock(text, {
			font: FontKey.Regular,
			fontSize: 10.5,
			color: COLORS.textMuted,
			spacingAfter: 2
		})
	}

	addSpacing(multiplier = 1) {
		const amount = 14 * multiplier
		if (this.cursorY - amount < PAGE_MARGIN) {
			this.startPage()
		}
		this.cursorY -= amount
	}

	addHorizontalRule() {
		const y = this.cursorY - 8
		this.ensureSpace(16)
		this.drawLine(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y, COLORS.divider, 0.7)
		this.cursorY -= 16
	}

	addSectionHeading(text: string) {
		this.drawTextBlock(text, {
			font: FontKey.Bold,
			fontSize: 15,
			color: COLORS.textPrimary,
			spacingBefore: 10,
			spacingAfter: 8
		})
	}

	addSubheading(text: string) {
		this.drawTextBlock(text, {
			font: FontKey.Bold,
			fontSize: 12,
			color: COLORS.textSecondary,
			spacingBefore: 6,
			spacingAfter: 6
		})
	}

	addParagraph(text: string) {
		this.drawWrappedText(text, {
			font: FontKey.Regular,
			fontSize: 11,
			color: COLORS.textPrimary,
			lineHeightFactor: DEFAULT_LINE_HEIGHT_FACTOR,
			spacingAfter: 10
		})
	}

	addNote(text: string) {
		this.drawWrappedText(text, {
			font: FontKey.Italic,
			fontSize: 10,
			color: COLORS.textMuted,
			lineHeightFactor: DEFAULT_LINE_HEIGHT_FACTOR,
			spacingAfter: 8
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
			columnRatios: [0.32, 0.68]
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
		const padding = 12
		const lineHeight = fontSize * (DEFAULT_LINE_HEIGHT_FACTOR + 0.05)
		const blockHeight = lineHeight * lines.length + padding * 2
		this.ensureSpace(blockHeight + 12)
		const top = this.cursorY
		const bottom = top - blockHeight
		this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, blockHeight, COLORS.codeBackground)
		let baseline = top - padding - fontSize * 0.25
		lines.forEach(line => {
			const encoded = this.fonts[FontKey.Mono].encodeText(line)
			this.currentPage.push('BT')
			this.currentPage.push(`/${FontKey.Mono} ${fontSize.toFixed(2)} Tf`)
			this.currentPage.push(toRgbCommand(COLORS.textPrimary, 'rg'))
			this.currentPage.push(`1 0 0 1 ${(PAGE_MARGIN + padding).toFixed(2)} ${baseline.toFixed(2)} Tm`)
			this.currentPage.push(`${encoded} Tj`)
			this.currentPage.push('ET')
			baseline -= lineHeight
		})
		this.cursorY = bottom - 14
	}

	private drawTable(table: PdfTableContent) {
		const ratios = normalizeRatios(table.columnRatios ?? [], table.columns.length)
		const columnWidths = ratios.map(ratio => ratio * CONTENT_WIDTH)
		const paddingX = 14
		const paddingY = 9

		const rows = [
			{ cells: table.columns, fontKey: FontKey.Bold, fontSize: 11.5, isHeader: true },
			...table.rows.map(row => ({ cells: row, fontKey: FontKey.Regular, fontSize: 10.5, isHeader: false }))
		]

		rows.forEach((row, rowIndex) => {
			const font = this.fonts[row.fontKey]
			const lineHeight = row.fontSize * 1.32
			const lineSets = row.cells.map((cell, columnIndex) => {
				const availableWidth = Math.max(
					(columnWidths[columnIndex] ?? CONTENT_WIDTH / table.columns.length) - paddingX * 2,
					row.fontSize
				)
				return wrapText(cell ?? '', availableWidth, font, row.fontSize)
			})
			const maxLines = lineSets.reduce((acc, set) => Math.max(acc, set.length), 1)
			const rowHeight = maxLines * lineHeight + paddingY * 2
			this.ensureSpace(rowHeight + 8)
			const top = this.cursorY
			const bottom = top - rowHeight
			if (row.isHeader) {
				this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, rowHeight, COLORS.tableHeader)
			} else if (rowIndex % 2 === 1) {
				this.fillRectangle(PAGE_MARGIN, bottom, CONTENT_WIDTH, rowHeight, COLORS.tableStripe)
			}
			this.drawLine(PAGE_MARGIN, top, PAGE_MARGIN + CONTENT_WIDTH, top, COLORS.tableBorder, row.isHeader ? 1 : 0.6)
			this.drawLine(PAGE_MARGIN, bottom, PAGE_MARGIN + CONTENT_WIDTH, bottom, COLORS.tableBorder, 0.6)
			let x = PAGE_MARGIN
			columnWidths.forEach((width, columnIndex) => {
				const actualWidth = width ?? CONTENT_WIDTH / table.columns.length
				this.drawLine(x, bottom, x, top, COLORS.tableBorder, 0.6)
				const lines = lineSets[columnIndex] ?? ['']
				let textBaseline = top - paddingY - row.fontSize * 0.25
				lines.forEach(line => {
					const encoded = font.encodeText(line)
					this.currentPage.push('BT')
					this.currentPage.push(`/${row.fontKey} ${row.fontSize.toFixed(2)} Tf`)
					this.currentPage.push(toRgbCommand(COLORS.textPrimary, 'rg'))
					this.currentPage.push(`1 0 0 1 ${(x + paddingX).toFixed(2)} ${textBaseline.toFixed(2)} Tm`)
					this.currentPage.push(`${encoded} Tj`)
					this.currentPage.push('ET')
					textBaseline -= lineHeight
				})
				x += actualWidth
			})
			this.drawLine(PAGE_MARGIN + CONTENT_WIDTH, bottom, PAGE_MARGIN + CONTENT_WIDTH, top, COLORS.tableBorder, 0.6)
			this.cursorY = bottom
		})
		this.cursorY -= 12
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
		const font = this.fonts[options.font]
		const lines = wrapText(text, CONTENT_WIDTH, font, options.fontSize)
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
			align?: 'left' | 'center'
		}
	) {
		if (options.spacingBefore) {
			this.addSpacing(options.spacingBefore / 12)
		}
		const font = this.fonts[options.font]
		const textWidth = font.measureText(text, options.fontSize)
		let x = PAGE_MARGIN
		if (options.align === 'center') {
			x = PAGE_MARGIN + Math.max(0, (CONTENT_WIDTH - textWidth) / 2)
		}
		const height = options.fontSize * DEFAULT_LINE_HEIGHT_FACTOR
		this.ensureSpace(height)
		this.drawTextAt(text, {
			font: options.font,
			fontSize: options.fontSize,
			color: options.color,
			x,
			y: this.cursorY
		})
		this.cursorY -= height
		if (options.spacingAfter) {
			this.cursorY -= options.spacingAfter
		}
	}

	private drawTextAt(text: string, options: { font: FontKey; fontSize: number; color: RGB; x: number; y: number }) {
		if (text.length === 0) {
			return
		}
		this.ensureWithinBounds(options.y)
		const encoded = this.fonts[options.font].encodeText(text)
		this.currentPage.push('BT')
		this.currentPage.push(`/${options.font} ${options.fontSize.toFixed(2)} Tf`)
		this.currentPage.push(toRgbCommand(options.color, 'rg'))
		this.currentPage.push(`1 0 0 1 ${options.x.toFixed(2)} ${options.y.toFixed(2)} Tm`)
		this.currentPage.push(`${encoded} Tj`)
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
const buildPdfDocument = (pages: string[][], fonts: EmbeddedFont[]) => {
	const headerBuffer = Buffer.from(`%PDF-1.7\n%âãÏÓ\n`, 'utf8')
	const objects: { id: number; buffer: Buffer }[] = []

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

	const usedFonts = fonts.filter(font => font.hasGlyphs)
	const fontResourceEntries: string[] = []
	usedFonts.forEach(font => {
		const { objects: fontObjects, type0Id } = font.buildFontObjects(nextId)
		fontResourceEntries.push(`/${font.key} ${type0Id} 0 R`)
		objects.push(...fontObjects)
		nextId += 6
	})

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
		const resources = usedFonts.length > 0 ? `<< /Font << ${fontResourceEntries.join(' ')} >> >>` : '<< >>'
		const buffer = Buffer.from(
			`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(
				2
			)}] /Resources ${resources} /Contents ${contentId} 0 R >>\nendobj\n`,
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

	objects.sort((a, b) => a.id - b.id)

	const buffers = objects.map(entry => entry.buffer)
	const offsets: number[] = [0]
	let position = headerBuffer.length

	buffers.forEach(buffer => {
		offsets.push(position)
		position += buffer.length
	})

	const xrefEntries = offsets
		.map((offset, index) => (index === 0 ? '0000000000 65535 f ' : `${offset.toString().padStart(10, '0')} 00000 n `))
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

	builder.addSectionHeading('Milestone Details')
	if (content.milestone?.details && content.milestone.details.length > 0) {
		builder.addKeyValuePairs(content.milestone.details)
	} else {
		builder.addNote(content.milestone?.note ?? 'Không có thông tin milestone trong payload')
	}

	builder.addSectionHeading('Milestone Submissions')
	if (content.milestoneSubmissions?.table) {
		builder.addTable(content.milestoneSubmissions.table)
		if (content.milestoneSubmissions.note) {
			builder.addNote(content.milestoneSubmissions.note)
		}
	} else {
		builder.addNote(content.milestoneSubmissions?.note ?? 'Không có milestone submission trong payload')
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
