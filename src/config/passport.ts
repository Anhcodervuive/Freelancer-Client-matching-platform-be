import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { GOOGLE } from './environment'
import { findOrCreateUserFromGoogle } from '~/services/auth.service'

passport.use(
	new GoogleStrategy(
		{
			clientID: GOOGLE.CLIENT_ID!,
			clientSecret: GOOGLE.CLIENT_SECRET!,
			callbackURL: GOOGLE.CALLBACK_URL!
		},
		async (accessToken, refreshToken, profile, done) => {
			// Xử lý lấy user từ DB hoặc tạo mới
			try {
				const user = await findOrCreateUserFromGoogle(profile)
				done(null, user)
			} catch (err) {
				done(err) // Đẩy lỗi vào flow Passport
			}
		}
	)
)
