import { Client } from 'pg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const dbConfig = {
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'marketplace',
  password: process.env.DB_PASSWORD || 'password',
  port: 5432,
};

async function setupDatabase() {
  const client = new Client(dbConfig);
  await client.connect();

  console.log('Creating products table...');
  await client.query(`
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
  
  await client.end();
}

async function ingestData() {
  const client = new Client(dbConfig);
  await client.connect();

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

  for (const product of productsToIngest) {
    await client.query(
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
  console.log(`Successfully ingested ${productsToIngest.length} products.`);
  await client.end();
}

async function run() {
  try {
    await setupDatabase();
    await ingestData();
    console.log('Database setup and data ingestion completed successfully!');
  } catch (error) {
    console.error('Error during execution:', error);
  }
}

run();
