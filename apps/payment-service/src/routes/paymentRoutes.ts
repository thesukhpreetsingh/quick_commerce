import { Router } from 'express';
import { handlePayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/', handlePayment);

export default router;
