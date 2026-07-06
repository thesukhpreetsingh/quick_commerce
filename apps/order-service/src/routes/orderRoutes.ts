import { Router } from 'express';
import { placeOrder } from '../controllers/orderController.js';

const router = Router();

router.post('/', placeOrder);

export default router;
