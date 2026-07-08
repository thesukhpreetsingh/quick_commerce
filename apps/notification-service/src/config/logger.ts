import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`);
  next();
};

export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  next(err);
};
