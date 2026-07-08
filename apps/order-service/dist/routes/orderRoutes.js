import { Router } from 'express';
import { placeOrder } from '../controllers/orderController.js';
import { orderQueue } from '../services/orderQueue.js';
const router = Router();
/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, address, phone, email, items, currency]
 *             properties:
 *               customerName:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               currency:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Order created successfully
 *       200:
 *         description: Order already existed for the provided idempotency key
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post('/', placeOrder);
/**
 * @openapi
 * /api/orders/queue:
 *   get:
 *     summary: Get order queue status
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Queue counts returned successfully
 */
router.get('/queue', async (req, res) => {
    try {
        const counts = await orderQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        res.json({ success: true, queue: counts });
    }
    catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({ success: false, error: 'Unable to read queue status' });
    }
});
export default router;
