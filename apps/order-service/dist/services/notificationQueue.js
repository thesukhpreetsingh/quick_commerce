import { Queue } from 'bullmq';
const connection = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
export const notificationQueueName = 'notification-queue';
export const notificationQueue = new Queue(notificationQueueName, { connection });
export async function enqueueNotification(payload) {
    await notificationQueue.add('send-notification', payload);
}
export default notificationQueue;
