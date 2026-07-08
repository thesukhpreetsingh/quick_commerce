import { Request, Response } from 'express';
import { processPayment as processPaymentService } from '../services/paymentService.js';
import { publishPaymentResult } from '../services/paymentQueue.js';

export const handlePayment = async (req: Request, res: Response) => {
  const { orderId, amount, currency, customerName, address } = req.body;

  if (!orderId || typeof amount !== 'number' || !currency) {
    return res.status(400).json({ success: false, error: 'orderId, amount, and currency are required' });
  }

  try {
    const result = await processPaymentService({ orderId, amount, currency, customerName, address });
    if (result.success) {
      // publish payment success
      publishPaymentResult({ orderId, success: true, transactionId: result.transactionId });
      return res.status(200).json(result);
    }
    // publish payment failure
    publishPaymentResult({ orderId, success: false, error: result.error });
    return res.status(402).json(result);
  } catch (error: any) {
    console.error('Payment processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Process a payment for an order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, currency]
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               customerName:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       402:
 *         description: Payment declined
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
