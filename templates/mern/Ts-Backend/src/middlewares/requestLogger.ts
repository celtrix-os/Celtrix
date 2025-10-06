import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    const userAgent = req.get('user-agent') || 'Unknown';
    const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms | IP: ${ip} | Agent: ${userAgent}`;

    if (statusCode >= 500) logger.error(message);
    else if (statusCode >= 400) logger.warn(message);
    else logger.info(message);
  });

  next();
};
