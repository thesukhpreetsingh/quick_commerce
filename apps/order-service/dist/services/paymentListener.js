import { Worker, JobScheduler } from 'bullmq';
import { query } from '../config/db.js';
import { timeoutQueue } from './orderQueue.js';
import { finalizeInventoryReservation, releaseInventoryReservation } from './inventoryClient.js';
import { enqueueNotification } from './notificationQueue.js';
import { shouldAcceptPaymentResult } from './paymentStateGuard.js';
const connection = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
};
const paymentQueueName = process.env.PAYMENT_QUEUE_NAME || 'payment-results';
const scheduler = new JobScheduler(paymentQueueName, { connection });
const worker = new Worker(paymentQueueName, async (job) => {
    const data = job.data;
    if (!data || !data.orderId)
        throw new Error('Invalid payment event');
    const currentOrder = await query('SELECT status FROM orders WHERE id = $1', [data.orderId]);
    const currentStatus = currentOrder.rows[0]?.status;
    if (!shouldAcceptPaymentResult(currentStatus)) {
        console.warn(`Ignoring late payment event for order ${data.orderId} because current status is ${currentStatus}`);
        return { handled: true, ignored: true };
    }
    if (data.success) {
        await query('UPDATE orders SET status = $1, transaction_id = $2, processed_at = NOW() WHERE id = $3', ['PAID', data.transactionId || null, data.orderId]);
        await finalizeInventoryReservation(data.orderId);
        console.log(`Order ${data.orderId} marked PAID`);
        // Notify Payment Success
        const order = await query('SELECT phone FROM orders WHERE id = $1', [data.orderId]);
        if (order.rows[0]) {
            await enqueueNotification({
                type: 'PAYMENT_SUCCESS',
                orderId: data.orderId,
                customerPhone: order.rows[0].phone,
                message: `Payment successful for order ${data.orderId}. Your order is now being processed!`
            }).catch(e => console.error('Notification enqueue failed:', e));
        }
    }
    else {
        await query('UPDATE orders SET status = $1, processed_at = NOW() WHERE id = $2', ['PAYMENT_FAILED', data.orderId]);
        await releaseInventoryReservation(data.orderId);
        console.log(`Order ${data.orderId} marked PAYMENT_FAILED`);
        // Notify Payment Failure
        const order = await query('SELECT phone FROM orders WHERE id = $1', [data.orderId]);
        if (order.rows[0]) {
            await enqueueNotification({
                type: 'PAYMENT_FAILED',
                orderId: data.orderId,
                customerPhone: order.rows[0].phone,
                message: `Payment failed for order ${data.orderId}. Please try again.`
            }).catch(e => console.error('Notification enqueue failed:', e));
        }
    }
    try {
        await timeoutQueue.remove(`timeout-${data.orderId}`);
    }
    catch (err) {
        console.warn(`Unable to remove timeout job for order ${data.orderId}`, err);
    }
    return { handled: true };
}, { connection });
worker.on('completed', (job) => console.log('Payment event processed', job.id));
worker.on('failed', (job, err) => console.error('Payment event worker failed', job?.id, err));
