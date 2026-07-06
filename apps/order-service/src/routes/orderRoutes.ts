import { Router } from 'express';
import { placeOrder } from '../controllers/orderController.js';
import { orderQueue } from '../services/orderQueue.js';

const router = Router();

router.post('/', placeOrder);

router.get('/queue', async (req, res) => {
  try {
    const counts = await orderQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
    res.json({ success: true, queue: counts });
  } catch (error: any) {
    console.error('Queue status error:', error);
    res.status(500).json({ success: false, error: 'Unable to read queue status' });
  }
});

export default router;
