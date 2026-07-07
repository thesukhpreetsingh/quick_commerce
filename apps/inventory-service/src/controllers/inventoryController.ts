import { Request, Response } from 'express';
import { getInventory, decreaseInventory, reserveInventory, releaseInventory, finalizeReservation } from '../services/inventoryService.js';

type InventoryRequest = {
  items: Array<{ productId: number; quantity: number }>;
};

type ReservationRequest = {
  orderId: string;
  items: Array<{ productId: number; quantity: number }>;
};

type ReservationActionRequest = {
  orderId: string;
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

export const reserveInventoryHandler = async (req: Request<{}, {}, ReservationRequest>, res: Response) => {
  try {
    const { orderId, items } = req.body;
    if (!orderId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'orderId and items array are required' });
    }
    const reserved = await reserveInventory(orderId, items.map((item) => ({
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

export const releaseInventoryHandler = async (req: Request<{}, {}, ReservationActionRequest>, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    const result = await releaseInventory(orderId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const finalizeInventoryHandler = async (req: Request<{}, {}, ReservationActionRequest>, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    const result = await finalizeReservation(orderId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
