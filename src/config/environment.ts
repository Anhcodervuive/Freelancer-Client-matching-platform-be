import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

export const PORT = process.env.PORT || 3000;
export const JWT = { 
    SECRET:  process.env?.JWT_SECRET ?? 'secret'
 };