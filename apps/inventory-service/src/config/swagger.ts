import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory Service API',
      version: '1.0.0',
      description: 'Inventory management endpoints for FairDeal Market',
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
});
