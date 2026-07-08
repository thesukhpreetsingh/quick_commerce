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

export async function getBulkInventory(productIds: number[]) {
  const keys = productIds.map(id => inventoryKey(id));
  const cachedValues = await redisClient.mGet(keys);
  
  const results: Record<number, number | null> = {};
  const missingIds: number[] = [];

  productIds.forEach((id, index) => {
    const val = cachedValues[index];
    if (val !== null) {
      results[id] = Number(val);
    } else {
      missingIds.push(id);
    }
  });

  if (missingIds.length > 0) {
    const mutexKey = 'lock:inventory:recompute';
    let acquired = false;
    
    // Mutex Lock on Cache-Miss to prevent Thundering Herd
    while (!acquired) {
      acquired = !!(await redisClient.set(mutexKey, 'locked', {
        NX: true,
        PX: 2000 // 2 second TTL
      }));

      if (acquired) {
        // This request is the "Chosen One" - fetch from DB and populate cache
        const pipeline = redisClient.multi();
        for (const id of missingIds) {
          const row = await getStockFromDb(id);
          if (row) {
            results[id] = row.stock;
            pipeline.set(inventoryKey(id), String(row.stock));
          } else {
            results[id] = null;
          }
        }
        await pipeline.exec();
        break;
      } else {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-check if the cache was populated by the other request
        const recheckValues = await redisClient.mGet(keys);
        const missingStill = recheckValues.filter(v => v === null).length;
        
        // If the number of missing items decreased, the other request is making progress
        // We return the current state of the cache to avoid infinite waiting
        if (missingStill < missingIds.length) {
          productIds.forEach((id, index) => {
            results[id] = recheckValues[index] !== null ? Number(recheckValues[index]) : null;
          });
          return results;
        }
      }
    }
  }

  return results;
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

const finalizePurchaseLua = `
  for i=1,#KEYS do
    local key = KEYS[i]
    local amount = tonumber(ARGV[i])
    redis.call('DECRBY', key, amount)
  end
  redis.call('DEL', 'all_products')
  return true
`;

const updateProductListLua = `
  for i=1,#KEYS do
    local key = KEYS[i]
    local newStock = ARGV[i]
    local productData = redis.call('GET', key)
    if productData then
      local decoded = cjson.decode(productData)
      decoded.stock = tonumber(newStock)
      redis.call('SET', key, cjson.encode(decoded))
    end
  end
  
  redis.call('DEL', 'all_products')
  return true
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
  
  // Granular Locking: Sort IDs to prevent deadlocks
  const sortedItems = [...items].sort((a, b) => a.productId - b.productId);
  const acquiredLocks: string[] = [];

  try {
    for (const item of sortedItems) {
      const lockKey = `lock:product:${item.productId}`;
      const lockAcquired = await redisClient.set(lockKey, 'locked', {
        NX: true,
        PX: 5000
      });

      if (!lockAcquired) {
        throw new Error(`Product ${item.productId} is currently being updated, please try again`);
      }
      acquiredLocks.push(lockKey);
    }

    for (const item of items) {
      const queryResult = await query(
        'UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE external_id = $2 RETURNING *',
        [item.quantity, item.productId]
      );
      if (queryResult.rows.length > 0) {
        updated.push(queryResult.rows[0]);
      }
    }

    // Use LUA to atomically update the cache to absolute DB values and invalidate the global list
    const updateKeys = updated.map(p => inventoryKey(p.external_id));
    const updateArgs = updated.map(p => String(p.stock));
    await redisClient.eval(updateProductListLua, { keys: updateKeys, arguments: updateArgs });

  } finally {
    // Release all acquired locks
    await Promise.all(acquiredLocks.map(key => redisClient.del(key)));
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
  const pipeline = redisClient.multi();
  for (const [productId, quantity] of Object.entries(reserved)) {
    const qty = Number(quantity);
    if (qty <= 0) continue;

    pipeline.incrBy(inventoryKey(Number(productId)), qty);
    released.push({ productId: Number(productId), quantity: qty });
  }

  pipeline.del(key);
  await pipeline.exec();
  return { orderId, released };
}

export async function finalizeReservation(orderId: string) {
  const key = reservationKey(orderId);
  const reserved = await redisClient.hGetAll(key);
  if (!reserved || Object.keys(reserved).length === 0) {
    return { orderId, finalized: false, reason: 'No reservation found' };
  }

  const finalized: Array<{ productId: number; quantity: number }> = [];
  const pipeline = redisClient.multi();
  const updatedStocks: {id: number, stock: number}[] = [];

  for (const [productId, quantity] of Object.entries(reserved)) {
    const qty = Number(quantity);
    if (qty <= 0) continue;

    const queryResult = await query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE external_id = $2 RETURNING *', [qty, Number(productId)]);
    if (queryResult.rows.length > 0) {
      const stock = queryResult.rows[0].stock;
      pipeline.set(inventoryKey(Number(productId)), String(stock));
      updatedStocks.push({id: Number(productId), stock});
    }
    finalized.push({ productId: Number(productId), quantity: qty });
  }

  pipeline.del(key);
  await pipeline.exec();

  // Update the global product list cache atomically using LUA
  if (updatedStocks.length > 0) {
    const updateKeys = updatedStocks.map(s => inventoryKey(s.id));
    const updateArgs = updatedStocks.map(s => String(s.stock));
    await redisClient.eval(updateProductListLua, { keys: updateKeys, arguments: updateArgs });
  }

  return { orderId, finalized };
}
