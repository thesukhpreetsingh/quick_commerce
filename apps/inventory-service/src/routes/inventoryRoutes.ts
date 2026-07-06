import { Router } from 'express';
import { fetchInventory, decreaseInventoryHandler, reserveInventoryHandler } from '../controllers/inventoryController.js';

const router = Router();

router.get('/:id', fetchInventory);
router.post('/decrease', decreaseInventoryHandler);
router.post('/reserve', reserveInventoryHandler);

export default router;
