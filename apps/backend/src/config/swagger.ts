import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const rootDir = path.resolve(__dirname, '..');

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Product API',
      version: '1.0.0',
      description: 'Product API for the backend service',
    },
    servers: [{ url: '/' }],
  },
  apis: [path.join(rootDir, 'routes/*.ts'), path.join(rootDir, 'routes/*.js')],
});
