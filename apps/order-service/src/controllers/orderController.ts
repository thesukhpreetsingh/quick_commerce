import { Request, Response } from 'express';
import { createOrder } from '../services/orderService.js';

export const placeOrder = async (req: Request, res: Response) => {
  try {
    const { customerName, address, items, idempotencyKey } = req.body;

    if (!customerName || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'customerName, address and items are required' });
    }

    const order = await createOrder({ customerName, address, items, idempotencyKey });
    const statusCode = order.idempotency_key ? 200 : 201;
    res.status(statusCode).json({ success: true, orderId: order.id, status: order.status });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Unable to place order', details: error.message });
  }
};
