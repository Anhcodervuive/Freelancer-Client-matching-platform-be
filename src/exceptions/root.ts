export class HttpException extends Error {
	statusCode: number
	errorCode: ErrorCode
	message: string
	errors: any

	constructor(statusCode: number, message: string, errorCode: ErrorCode, errors?: any) {
		super(message)
		this.statusCode = statusCode
		this.errorCode = errorCode
		this.message = message
		this.errors = errors
	}
}

export enum ErrorCode {
	// Cors
	CORS_NOT_ALLOWED = 100,

	// Authentication
	USER_NOT_FOUND = 1001,
	USER_ALREADY_EXISTS = 1002,
	INCORRECT_PASSWORD = 1003,
	UNAUTHORIED = 1004,
	ACCOUNT_NOT_VERIFIED = 1010,
	ACCOUNT_VERIFIED = 1011,

	// Req data
	UNPROCESSABLE_ENTITY = 2001,

	INTERNAL_SERVER_ERROR = 5000
}
