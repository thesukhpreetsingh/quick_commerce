import { Request, Response } from 'express';
import { query } from '../config/db';
import { getCache, setCache } from '../services/cacheService';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'all_products';
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await query('SELECT * FROM products');
    const products = result.rows;
    
    await setCache(cacheKey, products);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *       500:
 *         description: Internal server error
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await query('SELECT * FROM products WHERE external_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = result.rows[0];
    await setCache(cacheKey, product);
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by external id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: External product id
 *     responses:
 *       200:
 *         description: Product returned
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
