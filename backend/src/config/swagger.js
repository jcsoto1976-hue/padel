const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PADEL Club Manager API',
      version: '1.0.0',
      description: 'API REST para gestión integral de un club de pádel: reservas, quedadas, ranking ELO y torneos.',
      contact: {
        name: 'PADEL Club',
        email: 'admin@padel.club',
      },
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

module.exports = swaggerJsdoc(options);
