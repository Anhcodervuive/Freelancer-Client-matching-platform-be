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
	// Authentication
	USER_NOT_FOUND = 1001,
	USER_ALREADY_EXISTS = 1002,
	INCORRECT_PASSWORD = 1003,
	UNAUTHORIED = 2001,

	// Req data
	UNPROCESSABLE_ENTITY = 1004,

	INTERNAL_SERVER_ERROR = 5000
}
