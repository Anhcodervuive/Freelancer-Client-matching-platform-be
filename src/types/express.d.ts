// // src/types/express.d.ts
import { User } from '../generated/prisma'

declare module 'express-serve-static-core' {
	interface Request {
		user?: User
		decoded: any
	}
}

export {} // giữ file ở chế độ module
