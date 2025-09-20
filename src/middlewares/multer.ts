import multer from 'multer'

type MulterOpts = {
	allowed: RegExp[] // dựa trên mimetype
	maxSizeMB: number // giới hạn mỗi file
	maxFiles?: number // giới hạn tổng số file trong 1 request
}

export function makeMulter({ allowed, maxSizeMB, maxFiles }: MulterOpts) {
	return multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: maxSizeMB * 1024 * 1024, files: maxFiles },
		fileFilter: (_req, file, cb) => {
			if (allowed.some(re => re.test(file.mimetype))) cb(null, true)
			else cb(new Error('Unsupported file type: ' + file.mimetype))
		}
	})
}

// Preset: chỉ ảnh
export const uploadImages = makeMulter({
        allowed: [/^image\/(jpeg|png|webp|avif)$/],
        maxSizeMB: 5,
        maxFiles: 12
})

export const uploadPortfolioMedia = makeMulter({
        allowed: [/^image\//, /^video\//],
        maxSizeMB: 50,
        maxFiles: 15
})

// Preset: tài liệu chung (PDF/ZIP/DOCX/PNG/JPG…)
export const uploadAnyFiles = makeMulter({
        allowed: [
                /^image\/(jpeg|png|webp|avif)$/,
		/^application\/(pdf|zip|x-zip-compressed|msword|vnd.openxmlformats-officedocument\.wordprocessingml\.document)$/
	],
	maxSizeMB: 20,
	maxFiles: 20
})
