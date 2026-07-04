import express from 'express';
import cors from 'cors';
import { seedDatabase } from './services/seedService';
import productRoutes from './routes/productRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('Starting Backend Service...');
    
    // Run seeding logic on startup
    await seedDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 API available at http://localhost:${PORT}/api/products`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
