import { Worker, JobScheduler, Job } from 'bullmq';
import { queueName } from './orderQueue.js';
import { query } from '../config/db.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const scheduler = new JobScheduler(queueName, { connection });

scheduler.waitUntilReady().then(() => {
  console.log(`QueueScheduler for ${queueName} ready`);
}).catch((error) => {
  console.error('QueueScheduler failed to start:', error);
});

const worker = new Worker(
  queueName,
  async (job: Job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    const data = job.data;

    if (!data || !data.id) {
      throw new Error('Invalid order payload');
    }

    await query('UPDATE orders SET status = $1 WHERE id = $2', ['PROCESSING', data.id]);

    // Here you can call a payment service or other downstream services.
    // For now, we simulate work and mark the order as ready for payment.
    await new Promise((resolve) => setTimeout(resolve, 500));

    await query('UPDATE orders SET status = $1 WHERE id = $2', ['PAYMENT_PENDING', data.id]);

    console.log(`Job ${job.id} completed for order ${data.id}`);
    return { success: true };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job?.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});
