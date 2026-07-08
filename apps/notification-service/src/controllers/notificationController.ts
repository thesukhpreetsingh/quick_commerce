import { Request, Response } from 'express';
import { sendNotification } from '../services/notificationService.js';

export const handleNotification = async (req: Request, res: Response) => {
  const { type, orderId, customerPhone, message } = req.body;

  if (!type || !customerPhone) {
    return res.status(400).json({ success: false, error: 'type and customerPhone are required' });
  }

  try {
    await sendNotification({ type, orderId, customerPhone, message });
    res.status(200).json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};