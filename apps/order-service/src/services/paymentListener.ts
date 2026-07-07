import { Worker, JobScheduler, Job } from 'bullmq';
import { query } from '../config/db.js';
import { timeoutQueue } from './orderQueue.js';
import { finalizeInventoryReservation, releaseInventoryReservation } from './inventoryClient.js';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const paymentQueueName = process.env.PAYMENT_QUEUE_NAME || 'payment-results';

const scheduler = new JobScheduler(paymentQueueName, { connection });

const worker = new Worker(
  paymentQueueName,
  async (job: Job) => {
    const data = job.data;
    if (!data || !data.orderId) throw new Error('Invalid payment event');

    if (data.success) {
      await query('UPDATE orders SET status = $1, transaction_id = $2, processed_at = NOW() WHERE id = $3', ['PAID', data.transactionId || null, data.orderId]);
      await finalizeInventoryReservation(data.orderId);
      console.log(`Order ${data.orderId} marked PAID`);
    } else {
      await query('UPDATE orders SET status = $1, processed_at = NOW() WHERE id = $2', ['PAYMENT_FAILED', data.orderId]);
      await releaseInventoryReservation(data.orderId);
      console.log(`Order ${data.orderId} marked PAYMENT_FAILED`);
    }

    try {
      await timeoutQueue.remove(`timeout-${data.orderId}`);
    } catch (err) {
      console.warn(`Unable to remove timeout job for order ${data.orderId}`, err);
    }

    return { handled: true };
  },
  { connection }
);

worker.on('completed', (job) => console.log('Payment event processed', job.id));
worker.on('failed', (job, err) => console.error('Payment event worker failed', job?.id, err));
