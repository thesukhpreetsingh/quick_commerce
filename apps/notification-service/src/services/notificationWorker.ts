import { Worker, Job } from 'bullmq';
import { sendNotification } from './notificationService.js';
import { logger } from '../config/logger.js';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const notificationQueueName = 'notification-queue';

export const notificationWorker = new Worker(
  notificationQueueName,
  async (job: Job) => {
    const { type, orderId, customerPhone, message } = job.data;
    const jobInfo = `Notification event received: ${type} for order ${orderId} to ${customerPhone}`;
    logger.info(jobInfo);
    console.log(jobInfo);

    try {
      await sendNotification({ type, orderId, customerPhone, message });
    } catch (error: any) {
      const errMsg = `Worker failed to send notification for order ${orderId}: ${error?.message ?? error}`;
      logger.error(errMsg);
      console.error(errMsg);
      throw error; // Allow BullMQ to retry
    }
  },
  { connection }
);

notificationWorker.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed: ${err.message}`);
});
