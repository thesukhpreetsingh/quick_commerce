import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
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

export async function createOrder(orderData: OrderPayload) {
  if (orderData.idempotencyKey) {
    const existing = await query('SELECT * FROM orders WHERE idempotency_key = $1', [orderData.idempotencyKey]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
  }

  const orderId = uuidv4();
  const createdAt = new Date();
  const totalAmount = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderResult = await query(
    'INSERT INTO orders (id, customer_name, address, total_amount, status, idempotency_key, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [orderId, orderData.customerName, orderData.address, totalAmount, 'pending', orderData.idempotencyKey || null, createdAt]
  );

  const orderRecord = orderResult.rows[0];

  for (const item of orderData.items) {
    await query(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
      [orderId, item.productId, item.quantity, item.price]
    );
  }

  await enqueueOrder({ id: orderId, ...orderData, totalAmount, createdAt: createdAt.toISOString() });

  return orderRecord;
}
