import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
}

export async function getCache(key: string) {
  try {
    const data = await redisClient.get(key as any);
    return data ? JSON.parse(data as string) : null;
  } catch (e) {
    return null;
  }
}

export async function setCache(key: string, value: any, ttl = 3600) {
  try {
    await redisClient.set(key as any, JSON.stringify(value), {
      EX: ttl
    });
  } catch (e) {
    console.error('Redis set error:', e);
  }
}

export async function clearCache(pattern: string) {
  try {
    const keys = await redisClient.keys(pattern as any);
    if (Array.isArray(keys) && keys.length > 0) {
      await redisClient.del(keys as any);
    }
  } catch (e) {
    console.error('Redis clear error:', e);
  }
}

export { redisClient };
