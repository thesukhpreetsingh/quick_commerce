import { ulid } from 'ulid';
import { dbPool, query } from '../config/db.js';
import { redisClient } from '../config/redis.js';
import { enqueueOrder } from './orderQueue.js';
import { enqueueNotification } from './notificationQueue.js';
import { reserveInventory as reserveInventoryGrpc } from './inventoryGrpcClient.js';
async function reserveInventory(orderId, items) {
    await reserveInventoryGrpc(orderId, items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
}
async function persistOrder(orderId, orderData, totalAmount, createdAt) {
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        const orderResult = await client.query('INSERT INTO orders (id, customer_name, address, phone, email, total_amount, currency, status, idempotency_key, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [orderId, orderData.customerName, orderData.address, orderData.phone, orderData.email, totalAmount, orderData.currency, 'PENDING_INVENTORY', orderData.idempotencyKey || null, createdAt]);
        for (const item of orderData.items) {
            await client.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)', [orderId, item.productId, item.quantity, item.price]);
        }
        await client.query('COMMIT');
        return orderResult.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function sendOrderCreatedNotification(orderId, phone) {
    await enqueueNotification({
        type: 'ORDER_CREATED',
        orderId,
        customerPhone: phone,
        message: `Your order ${orderId} has been placed successfully and is awaiting payment!`
    }).catch(e => console.error('Notification enqueue failed:', e));
}
async function updateOrderStatus(orderId, status) {
    await query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
}
export async function createOrder(orderData) {
    const idempotencyKey = orderData.idempotencyKey?.trim();
    if (idempotencyKey) {
        const cachedOrderId = await redisClient.get(`idempotency:${idempotencyKey}`);
        if (cachedOrderId) {
            const existing = await query('SELECT * FROM orders WHERE id = $1', [cachedOrderId]);
            if (existing.rows.length > 0) {
                return existing.rows[0];
            }
        }
        const existingByKey = await query('SELECT * FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
        if (existingByKey.rows.length > 0) {
            await redisClient.set(`idempotency:${idempotencyKey}`, existingByKey.rows[0].id);
            return existingByKey.rows[0];
        }
    }
    const orderId = ulid();
    const createdAt = new Date();
    const totalAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderRecord = await persistOrder(orderId, orderData, totalAmount, createdAt);
    // Send Order Created Notification
    await sendOrderCreatedNotification(orderId, orderData.phone);
    try {
        await reserveInventory(orderId, orderData.items);
        await updateOrderStatus(orderId, 'INVENTORY_RESERVED');
    }
    catch (error) {
        await updateOrderStatus(orderId, 'INVENTORY_FAILED');
        throw error;
    }
    if (idempotencyKey) {
        await redisClient.set(`idempotency:${idempotencyKey}`, orderId);
    }
    await enqueueOrder({ id: orderId, ...orderData, totalAmount, createdAt: createdAt.toISOString() });
    return orderRecord;
}
