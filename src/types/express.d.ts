// // src/types/express.d.ts
import { User } from '../generated/prisma'
// import express from "express";

// declare module 'express' {
//     export interface Request {
//         user?: User; // Optional user property
//     }
// }

// namespace Express {
//     export interface Request {
//         user?: User; // Optional user property
//     }
// }

// src/types/express.d.ts
// import type { User } from "@prisma/client"; // hoặc đúng path type User của bạn

declare module 'express-serve-static-core' {
	interface Request {
		user?: User
		decoded: any
	}
}

export {} // giữ file ở chế độ module
