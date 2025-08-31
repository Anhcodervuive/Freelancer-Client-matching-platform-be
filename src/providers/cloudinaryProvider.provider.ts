// libs/cloudinary-upload.ts
import { v2 as cloudinary } from 'cloudinary'
import { CLOUDINARY_CONFIG_INFO } from '~/config/environment'

const BASE_FOLDER = CLOUDINARY_CONFIG_INFO.BASE_FOLDER || ''

export function joinFolder(sub?: string) {
	const clean = (s?: string) => (s || '').replace(/^\/+|\/+$/g, '')
	const parts = [clean(BASE_FOLDER), clean(sub)].filter(Boolean)
	return parts.join('/') || undefined
}

export const cloudinaryProvider = cloudinary.config({
	cloud_name: CLOUDINARY_CONFIG_INFO.CLOUD_NAME!,
	api_key: CLOUDINARY_CONFIG_INFO.API_KEY!,
	api_secret: CLOUDINARY_CONFIG_INFO.API_SECRET!
})

export function resourceTypeFor(mime: string): 'image' | 'video' | 'raw' {
	if (mime.startsWith('image/')) return 'image'
	if (mime.startsWith('video/')) return 'video'
	return 'raw'
}

export function uploadBufferToCloudinary(buffer: Buffer, opts: { folder: string; mime: string }) {
	return new Promise<any>((resolve, reject) => {
		const uploadOptions: any = {
			folder: joinFolder(opts.folder),
			resource_type: resourceTypeFor(opts.mime),
			unique_filename: true,
			overwrite: false
		}
		if (opts.mime.startsWith('image/')) {
			uploadOptions.transformation = [{ quality: 'auto:good', fetch_format: 'auto' }]
		}
		cloudinary.uploader
			.upload_stream(uploadOptions, (err, res) => (err || !res ? reject(err) : resolve(res)))
			.end(buffer)
	})
}

export function destroyCloudinary(publicId: string, mime?: string) {
	return cloudinary.uploader.destroy(publicId, {
		resource_type: mime ? resourceTypeFor(mime) : 'image'
	})
}
