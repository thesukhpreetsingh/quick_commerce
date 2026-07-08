import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import { logger, requestLogger, errorLogger } from './config/logger.js';
import './services/notificationWorker.js'; // Initialize the worker

console.log('1. Starting application');
console.log(process.env);

const app = express();
const PORT = process.env.PORT || 6002;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.send('Notification service is running');
});

// Notifications are produced/consumed via Redis/BullMQ; no HTTP routes required here.

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use(errorLogger);

app.listen(PORT, () => {
  logger.info(`Notification service listening on http://localhost:${PORT}`);
});
