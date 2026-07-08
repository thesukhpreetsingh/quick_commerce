import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { connectRedis, pingRedis } from './config/redis.js';
import { dbPool } from './config/db.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import { logger, requestLogger, errorLogger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';
import { startInventoryGrpcServer } from './grpc/inventoryGrpcServer.js';
const app = express();
const PORT = process.env.PORT || 7000;
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.get('/', (req, res) => {
    res.send('Inventory service is running');
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', async (req, res) => {
    const health = { redis: 'DOWN', db: 'DOWN' };
    let overallUp = true;
    try {
        await pingRedis();
        health.redis = 'UP';
    }
    catch (error) {
        overallUp = false;
        health.redis = 'DOWN';
    }
    try {
        await dbPool.query('SELECT 1');
        health.db = 'UP';
    }
    catch (error) {
        overallUp = false;
        health.db = 'DOWN';
    }
    res.status(overallUp ? 200 : 503).json({ status: overallUp ? 'UP' : 'DOWN', ...health, timestamp: new Date().toISOString() });
});
app.use('/api/inventory', inventoryRoutes);
async function start() {
    await connectRedis();
    await dbPool.query('SELECT 1');
    await startInventoryGrpcServer();
    app.listen(PORT, () => {
        logger.info(`Inventory service listening on http://localhost:${PORT}`);
    });
}
app.use(errorLogger);
start().catch((error) => {
    logger.error('Inventory service failed to start', { error: error.message || error });
    process.exit(1);
});
