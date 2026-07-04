import { Request, Response } from 'express';
import { query } from '../config/db';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM products');
    res.json({ products: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE external_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
