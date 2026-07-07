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
