import { query } from '../config/db.js';
import { redisClient } from '../config/redis.js';

type InventoryUpdate = {
  productId: number;
  quantity: number;
};

const inventoryKey = (productId: number) => `inventory:product:${productId}`;

async function getStockFromDb(productId: number) {
  const result = await query('SELECT stock FROM products WHERE external_id = $1', [productId]);
  return result.rows[0] || null;
}

async function ensureStockCached(productId: number) {
  const key = inventoryKey(productId);
  const cached = await redisClient.get(key);
  if (cached !== null) {
    return Number(cached);
  }

  const row = await getStockFromDb(productId);
  if (!row) {
    return null;
  }

  await redisClient.set(key, String(row.stock));
  return row.stock;
}

export async function getInventory(productId: number) {
  const stock = await ensureStockCached(productId);
  return stock === null ? null : { stock };
}

const inventoryDecrementLua = `
  for i=1,#KEYS do
    local current = tonumber(redis.call('GET', KEYS[i]) or '-1')
    local amount = tonumber(ARGV[i])
    if current < amount then
      return nil
    end
  end
  local results = {}
  for i=1,#KEYS do
    local key = KEYS[i]
    local amount = tonumber(ARGV[i])
    local newValue = redis.call('DECRBY', key, amount)
    table.insert(results, tostring(newValue))
  end
  return results
`;

export async function decreaseInventory(items: InventoryUpdate[]) {
  const keys = items.map((item) => inventoryKey(item.productId));
  const args = items.map((item) => String(item.quantity));

  await Promise.all(items.map(async (item) => {
    const stock = await ensureStockCached(item.productId);
    if (stock === null) {
      throw new Error(`Product ${item.productId} not found`);
    }
  }));

  const result = await redisClient.eval(inventoryDecrementLua, {
    keys,
    arguments: args,
  });

  if (!Array.isArray(result)) {
    throw new Error('Insufficient stock for one or more items');
  }

  const updated: any[] = [];
  for (const item of items) {
    const queryResult = await query(
      'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE external_id = $2 RETURNING *',
      [item.quantity, item.productId]
    );
    if (queryResult.rows.length > 0) {
      updated.push(queryResult.rows[0]);
    }
  }

  return updated;
}
