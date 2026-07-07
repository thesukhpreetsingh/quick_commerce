import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const paymentQueueName = process.env.PAYMENT_QUEUE_NAME || 'payment-results';

export const paymentQueue = new Queue(paymentQueueName, { connection });

export async function publishPaymentResult(payload: any) {
  const jobId = payload.orderId;
  return paymentQueue.add('payment-result', payload, { jobId });
}

export default paymentQueue;
