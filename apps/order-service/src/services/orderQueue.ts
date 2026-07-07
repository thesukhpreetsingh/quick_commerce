import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: +process.env.REDIS_PORT,
};

export const queueName = process.env.ORDER_QUEUE_NAME || 'order-queue';

export const orderQueue = new Queue(queueName, {
  connection,
});

export const timeoutQueue = new Queue('payment-timeouts', {
  connection,
});

export async function enqueueOrder(orderPayload: any) {
  const jobId = orderPayload.id;
  return orderQueue.add('process-order', orderPayload, { jobId });
}

// create a delayed check job to expire payment after 1 minute
export async function schedulePaymentTimeout(orderId: string, delayMs = 60_000) {
  return timeoutQueue.add('payment-timeout', { orderId }, { delay: delayMs, jobId: `timeout-${orderId}` });
}
