import { Router } from 'express';
import {
  fetchInventory,
  decreaseInventoryHandler,
  reserveInventoryHandler,
  releaseInventoryHandler,
  finalizeInventoryHandler,
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/:id', fetchInventory);
router.post('/decrease', decreaseInventoryHandler);
router.post('/reserve', reserveInventoryHandler);
router.post('/release', releaseInventoryHandler);
router.post('/finalize', finalizeInventoryHandler);

export default router;
