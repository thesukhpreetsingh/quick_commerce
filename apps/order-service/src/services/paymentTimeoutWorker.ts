import { Worker, JobScheduler, Job } from 'bullmq';
import { query } from '../config/db.js';
import { releaseInventoryReservation } from './inventoryGrpcClient.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const queueName = 'payment-timeouts';
const scheduler = new JobScheduler(queueName, { connection });

const worker = new Worker(
  queueName,
  async (job: Job) => {
    const data = job.data;
    if (!data || !data.orderId) {
      throw new Error('Invalid timeout payload');
    }

    const orderId = data.orderId;
    await query('UPDATE orders SET status = $1, processed_at = NOW() WHERE id = $2', ['PAYMENT_FAILED', orderId]);
    await releaseInventoryReservation(orderId);
    console.log(`Payment timeout fired for order ${orderId}. Order marked PAYMENT_FAILED and inventory released.`);
    return { timedOut: true };
  },
  { connection }
);

worker.on('completed', (job) => console.log(`Timeout job completed ${job.id}`));
worker.on('failed', (job, err) => console.error(`Timeout job failed ${job?.id}:`, err));
