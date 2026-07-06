import { ulid } from 'ulid';
import http from 'http';
import https from 'https';
import { dbPool, query } from '../config/db.js';
import { enqueueOrder } from './orderQueue.js';

type OrderItem = {
  productId: number;
  quantity: number;
  price: number;
};

type OrderPayload = {
  customerName: string;
  address: string;
  items: OrderItem[];
  idempotencyKey?: string;
};

async function reserveInventory(items: OrderItem[]) {
  const inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:7000';
  const url = new URL('/api/inventory/reserve', inventoryUrl);
  const body = JSON.stringify({ items });
  const client = url.protocol === 'https:' ? https : http;

  return new Promise<void>((resolve, reject) => {
    const request = client.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            return resolve();
          }

          const message = data || res.statusMessage;
          return reject(new Error(`Inventory reservation failed (${res.statusCode}): ${message}`));
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function persistOrder(orderId: string, orderData: OrderPayload, totalAmount: number, createdAt: Date) {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'INSERT INTO orders (id, customer_name, address, total_amount, status, idempotency_key, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [orderId, orderData.customerName, orderData.address, totalAmount, 'PENDING_INVENTORY', orderData.idempotencyKey || null, createdAt]
    );

    for (const item of orderData.items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    return orderResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateOrderStatus(orderId: string, status: string) {
  await query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
}

export async function createOrder(orderData: OrderPayload) {
  if (orderData.idempotencyKey) {
    const existing = await query('SELECT * FROM orders WHERE idempotency_key = $1', [orderData.idempotencyKey]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
  }

  const orderId = ulid();
  const createdAt = new Date();
  const totalAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderRecord = await persistOrder(orderId, orderData, totalAmount, createdAt);

  try {
    await reserveInventory(orderData.items);
    await updateOrderStatus(orderId, 'INVENTORY_RESERVED');
  } catch (error) {
    await updateOrderStatus(orderId, 'INVENTORY_FAILED');
    throw error;
  }

  await enqueueOrder({ id: orderId, ...orderData, totalAmount, createdAt: createdAt.toISOString() });
  return orderRecord;
}
