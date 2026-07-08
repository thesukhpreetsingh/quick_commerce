import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Service API',
      version: '1.0.0',
      description: 'Payment processing endpoints for FairDeal Market',
    },
    servers: [{ url: '/' }],
  },
  apis: [
    path.join(rootDir, 'routes/*.ts'),
    path.join(rootDir, 'routes/*.js'),
    path.join(rootDir, 'controllers/*.ts'),
    path.join(rootDir, 'controllers/*.js'),
  ],
});
