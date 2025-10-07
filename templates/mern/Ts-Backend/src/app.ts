import express, { Express, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './cron/zipOldLogs';
import { requestLogger } from './middlewares/requestLogger';
import { env } from './constant/env.constant';
import { UserRoutes } from './api/user/v1/user.routes';
import logger from './utils/logger';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(requestLogger);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.status(200).json({
    message: 'Api is working fine',
    status: 'success',
  });
});

app.use('/api', UserRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    `${req.method} ${req.originalUrl} - ${err.message || 'Unknown Error'}`,
  );

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

logger.info(`App initialized in ${env.NODE_ENV} mode`);

export default app;
