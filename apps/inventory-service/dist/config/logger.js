import winston from 'winston';
import expressWinston from 'express-winston';
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.timestamp(), winston.format.printf(({ timestamp, level, message, meta }) => {
        return `${timestamp} [${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
    })),
});
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [consoleTransport],
});
export const requestLogger = expressWinston.logger({
    winstonInstance: logger,
    msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
    expressFormat: false,
    colorize: true,
});
export const errorLogger = expressWinston.errorLogger({
    winstonInstance: logger,
});
