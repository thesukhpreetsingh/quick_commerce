import { Queue } from 'bullmq';
import { redisClient } from '../config/redis.js';

const queueName = process.env.ORDER_QUEUE_NAME || 'order-queue';

export const orderQueue = new Queue(queueName, {
  connection: {
    host: process.env.REDIS_HOST,
    port: +process.env.REDIS_PORT,
  },
});

export async function enqueueOrder(orderPayload: any) {
  const jobId = orderPayload.id;
  return orderQueue.add('process-order', orderPayload, { jobId });
}
