import { query } from '../config/db.js';
export async function seedOrderTables() {
    await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      total_amount NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'PENDING_INVENTORY',
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP NOT NULL,
      processed_at TIMESTAMP
    )
  `);
    await query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS transaction_id TEXT;
  `);
    await query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL
    )
  `);
}
