import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectRedis, pingRedis } from './config/redis.js';
import { dbPool } from './config/db.js';
import { seedOrderTables } from './services/orderSeedService.js';
import orderRoutes from './routes/orderRoutes.js';
import { logger, requestLogger, errorLogger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';
import './services/orderQueue.js';
import './services/orderWorker.js';
import './services/paymentListener.js';
import './services/paymentTimeoutWorker.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 6000;
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.get('/', (req, res) => {
    res.send('Order service is running');
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/orders', orderRoutes);
app.get('/health', async (req, res) => {
    const inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:7000';
    const health = { redis: 'DOWN', db: 'DOWN', inventory: 'DOWN' };
    let overallUp = true;
    try {
        await pingRedis();
        health.redis = 'UP';
    }
    catch (err) {
        overallUp = false;
        health.redis = 'DOWN';
    }
    try {
        await dbPool.query('SELECT 1');
        health.db = 'UP';
    }
    catch (err) {
        overallUp = false;
        health.db = 'DOWN';
    }
    try {
        const response = await fetch(`${inventoryUrl}/health`);
        if (response.ok) {
            const payload = await response.json();
            health.inventory = payload.status === 'UP' ? 'UP' : 'DOWN';
            if (health.inventory !== 'UP') {
                overallUp = false;
            }
        }
        else {
            overallUp = false;
            health.inventory = 'DOWN';
        }
    }
    catch (err) {
        overallUp = false;
        health.inventory = 'DOWN';
    }
    res.status(overallUp ? 200 : 503).json({ status: overallUp ? 'UP' : 'DOWN', ...health, timestamp: new Date().toISOString() });
});
async function start() {
    await connectRedis();
    await seedOrderTables();
    app.listen(PORT, () => {
        logger.info(`Order service listening on http://localhost:${PORT}`);
    });
}
app.use(errorLogger);
start().catch((err) => {
    logger.error('Failed to start order service:', { error: err.message || err });
    process.exit(1);
});
