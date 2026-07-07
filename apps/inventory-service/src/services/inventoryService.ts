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

const reservationKey = (orderId: string) => `reservation:${orderId}`;

export async function reserveInventory(orderId: string, items: InventoryUpdate[]) {
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

  const reservationEntries: Array<[string, string]> = items.map((item) => [String(item.productId), String(item.quantity)]);

  if (reservationEntries.length > 0) {
    await redisClient.hSet(reservationKey(orderId), Object.fromEntries(reservationEntries));
    await redisClient.expire(reservationKey(orderId), 300);
  }

  return {
    orderId,
    reserved: items,
  };
}

export async function releaseInventory(orderId: string) {
  const key = reservationKey(orderId);
  const reserved = await redisClient.hGetAll(key);
  if (!reserved || Object.keys(reserved).length === 0) {
    return { orderId, released: [] };
  }

  const released: Array<{ productId: number; quantity: number }> = [];
  for (const [productId, quantity] of Object.entries(reserved)) {
    const qty = Number(quantity);
    if (qty <= 0) continue;

    await redisClient.incrBy(inventoryKey(Number(productId)), qty);
    released.push({ productId: Number(productId), quantity: qty });
  }

  await redisClient.del(key);
  return { orderId, released };
}

export async function finalizeReservation(orderId: string) {
  const key = reservationKey(orderId);
  const reserved = await redisClient.hGetAll(key);
  if (!reserved || Object.keys(reserved).length === 0) {
    return { orderId, finalized: false, reason: 'No reservation found' };
  }

  const finalized: Array<{ productId: number; quantity: number }> = [];
  for (const [productId, quantity] of Object.entries(reserved)) {
    const qty = Number(quantity);
    if (qty <= 0) continue;

    await query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE external_id = $2 RETURNING *', [qty, Number(productId)]);
    finalized.push({ productId: Number(productId), quantity: qty });
  }

  await redisClient.del(key);
  return { orderId, finalized };
}
