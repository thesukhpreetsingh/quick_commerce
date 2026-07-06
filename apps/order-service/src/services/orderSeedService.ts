import { query } from '../config/db.js';

export async function seedOrderTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL,
      total_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_INVENTORY',
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP NOT NULL,
      processed_at TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL
    )
  `);
}
