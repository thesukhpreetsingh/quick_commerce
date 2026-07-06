import { Request, Response } from 'express';
import { getInventory, decreaseInventory } from '../services/inventoryService.js';

type InventoryRequest = {
  items: Array<{ productId: number; quantity: number }>;
};

export const fetchInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stockData = await getInventory(Number(id));
    if (!stockData) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(stockData);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const decreaseInventoryHandler = async (req: Request<{}, {}, InventoryRequest>, res: Response) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const updated = await decreaseInventory(items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    })));
    res.json({ success: true, updated });
  } catch (error: any) {
    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const reserveInventoryHandler = async (req: Request<{}, {}, InventoryRequest>, res: Response) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const reserved = await decreaseInventory(items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    })));
    res.json({ success: true, reserved });
  } catch (error: any) {
    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
