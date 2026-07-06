import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis.js';
import { seedOrderTables } from './services/orderSeedService.js';
import orderRoutes from './routes/orderRoutes.js';
import './services/orderQueue.js';
import './services/orderWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Order service is running');
});

app.use('/api/orders', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

async function start() {
  await connectRedis();
  await seedOrderTables();

  app.listen(PORT, () => {
    console.log(`Order service listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start order service:', err);
  process.exit(1);
});
