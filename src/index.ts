import express, { Request, Response } from 'express';
import morgan from 'morgan'

import { PORT } from './config/environment';

const app = express();
app.use(express.json());

app.use(morgan('combined'))

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})