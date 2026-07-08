import dotenv from 'dotenv'
dotenv.config()
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { seedDatabase } from './services/seedService';
import { connectRedis } from './services/cacheService';
import productRoutes from './routes/productRoutes';
import { logger, requestLogger, errorLogger } from './config/logger';
import { swaggerSpec } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Root route for verification
app.get('/', (req, res) => {
  res.send('Backend is running! API available at /api/products');
});

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/products', productRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('Starting Backend Service...');
    
    // Connect to Redis
    await connectRedis();
    
    // Run seeding logic on startup
    await seedDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 API available at http://localhost:${PORT}/api/products`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', { error: error.message || error });
    process.exit(1);
  }
}

app.use(errorLogger);

startServer();
