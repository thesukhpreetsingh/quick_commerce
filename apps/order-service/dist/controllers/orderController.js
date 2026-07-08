import { createOrder } from '../services/orderService.js';
export const placeOrder = async (req, res) => {
    try {
        const { customerName, address, phone, email, items, idempotencyKey, currency } = req.body;
        if (!customerName || !address || !phone || !email || !Array.isArray(items) || items.length === 0 || !currency) {
            return res.status(400).json({ error: 'customerName, address, phone, email, items and currency are required' });
        }
        const order = await createOrder({ customerName, address, phone, email, items, idempotencyKey, currency });
        const statusCode = order.idempotency_key ? 200 : 201;
        res.status(statusCode).json({ success: true, orderId: order.id, status: order.status });
    }
    catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Unable to place order', details: error.message });
    }
};
