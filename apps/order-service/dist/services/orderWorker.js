import { Worker, JobScheduler } from 'bullmq';
import { queueName } from './orderQueue.js';
import { query } from '../config/db.js';
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
const scheduler = new JobScheduler(queueName, { connection });
scheduler.waitUntilReady().then(() => {
    console.log(`JobScheduler for ${queueName} ready`);
}).catch((error) => {
    console.error('JobScheduler failed to start:', error);
});
const worker = new Worker(queueName, async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    const data = job.data;
    if (!data || !data.id) {
        throw new Error('Invalid order payload');
    }
    await query('UPDATE orders SET status = $1 WHERE id = $2', ['PROCESSING', data.id]);
    // mark the order ready for payment and schedule a timeout
    await query('UPDATE orders SET status = $1 WHERE id = $2', ['PAYMENT_PENDING', data.id]);
    try {
        const { schedulePaymentTimeout } = await import('./orderQueue.js');
        await schedulePaymentTimeout(data.id, 60000);
    }
    catch (err) {
        console.error('Failed to schedule payment timeout', err);
    }
    console.log(`Job ${job.id} completed for order ${data.id} (now PAYMENT_PENDING)`);
    return { success: true };
}, { connection });
worker.on('completed', (job) => {
    console.log(`Job ${job?.id} completed successfully`);
});
worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});
worker.on('error', (err) => {
    console.error('Worker error:', err);
});
