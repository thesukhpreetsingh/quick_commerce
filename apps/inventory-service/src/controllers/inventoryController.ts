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

/**
 * @openapi
 * /api/inventory/{id}:
 *   get:
 *     summary: Fetch inventory for a product
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product id
 *     responses:
 *       200:
 *         description: Inventory returned
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */

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

/**
 * @openapi
 * /api/inventory/decrease:
 *   post:
 *     summary: Decrease inventory for items
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Inventory decreased
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

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

/**
 * @openapi
 * /api/inventory/reserve:
 *   post:
 *     summary: Reserve inventory for an order
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, items]
 *             properties:
 *               orderId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Inventory reserved
 *       400:
 *         description: Bad request / insufficient stock
 *       500:
 *         description: Internal server error
 */

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

/**
 * @openapi
 * /api/inventory/release:
 *   post:
 *     summary: Release reserved inventory for an order
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation released
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

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

/**
 * @openapi
 * /api/inventory/finalize:
 *   post:
 *     summary: Finalize a reservation (commit inventory to order)
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation finalized
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
