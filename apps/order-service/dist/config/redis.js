import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
export const redisClient = createClient({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Order service connected to Redis');
    }
}
export async function pingRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return await redisClient.ping();
}
