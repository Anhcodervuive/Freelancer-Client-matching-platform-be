import { StatusCodes } from 'http-status-codes'
import { ErrorCode, HttpException } from '~/exceptions/root'
import { WHITELIST_DOMAINS } from '~/utils/constant'
import { NODE_ENV } from './environment'

// Cấu hình CORS Option trong dự án thực tế (Video số 62 trong chuỗi MERN Stack Pro)
export const corsOptions: any = {
	origin: function (origin: string, callback: Function) {
		// Cho phép việc gọi API bằng POSTMAN trên môi trường dev,
		// Thông thường khi sử dụng postman thì cái origin sẽ có giá trị là undefined
		if (!origin && NODE_ENV === 'development') {
			return callback(null, true)
		}

		// Kiểm tra dem origin có phải là domain được chấp nhận hay không
		if (WHITELIST_DOMAINS.includes(origin)) {
			return callback(null, true)
		}

		// Cuối cùng nếu domain không được chấp nhận thì trả về lỗi
		return callback(
			new HttpException(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`, ErrorCode.CORS_NOT_ALLOWED)
		)
	},

	// Some legacy browsers (IE11, various SmartTVs) choke on 204
	optionsSuccessStatus: 200,

	// CORS sẽ cho phép nhận cookies từ request, (Nhá hàng :D | Ở khóa MERN Stack Advance nâng cao học trực tiếp mình sẽ hướng dẫn các bạn đính kèm jwt access token và refresh token vào httpOnly Cookies)
	credentials: true
}
