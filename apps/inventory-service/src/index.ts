import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis.js';
import inventoryRoutes from './routes/inventoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Inventory service is running');
});

app.use('/api/inventory', inventoryRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

async function start() {
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Inventory service listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Inventory service failed to start', error);
  process.exit(1);
});
