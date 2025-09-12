import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import path from 'node:path'
// (tuỳ chọn) nạp biến môi trường
// import 'dotenv/config'

export default defineConfig({
	schema: path.join('prisma', 'schema.prisma'),
	migrations: {
		path: path.join('prisma', 'migrations'),
		// CÁCH 1: seed bằng tsx và nạp .env
		// seed: 'tsx --env-file=.env prisma/seed/index.ts'
		// CÁCH 2: hoặc dùng ts-node
		seed: 'ts-node prisma/seed/index.ts'
		// CÁCH 3: nếu là JS thuần
		// seed: 'node prisma/seed/index.js',
	}
})
