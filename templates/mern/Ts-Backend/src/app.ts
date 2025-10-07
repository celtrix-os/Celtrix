import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './constant/env.constant';
import { UserRoutes } from './api/user/v1/user.routes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Api is working fine',
    status: 'success',
  });
});

app.use('/api', UserRoutes);

export default app;
