import { query } from '../config/db';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function seedDatabase() {
  console.log('Checking for database schema...');
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      external_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      price DECIMAL(10, 2),
      stock INTEGER,
      description TEXT,
      category TEXT,
      rating DECIMAL(3, 2),
      tags TEXT[],
      sku TEXT,
      meta_data JSONB,
      images TEXT[],
      thumbnail TEXT,
      brand TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  let productsToIngest: any[] = [];
  const jsonPath = path.join(__dirname, '../../data/products_seed.json');

  if (fs.existsSync(jsonPath)) {
    console.log('Loading data from local JSON file...');
    const fileData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    productsToIngest = Object.values(fileData).flat();
  } else {
    console.log('Local JSON not found. Fetching from API...');
    const categories = ['groceries', 'smartphones'];
    for (const category of categories) {
      try {
        const response = await axios.get(`https://dummyjson.com/products/category/${category}`);
        productsToIngest = [...productsToIngest, ...response.data.products];
      } catch (error: any) {
        console.error(`Error fetching ${category}:`, error.message);
      }
    }
  }

  console.log(`Ingesting ${productsToIngest.length} products...`);
  for (const product of productsToIngest) {
    await query(
      `INSERT INTO products 
      (external_id, title, price, stock, description, category, rating, tags, sku, meta_data, images, thumbnail, brand) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (external_id) DO NOTHING`,
      [
        product.id,
        product.title,
        product.price,
        product.stock,
        product.description,
        product.category,
        product.rating,
        product.tags,
        product.sku,
        JSON.stringify(product.meta),
        product.images,
        product.thumbnail,
        product.brand
      ]
    );
  }
  console.log('Database seeding completed.');
}
