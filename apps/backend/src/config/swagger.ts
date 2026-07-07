import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Product API',
      version: '1.0.0',
      description: 'Product API for the backend service',
    },
  },
  apis: ['./src/routes/*.ts'],
});
