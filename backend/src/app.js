require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/auth');
const courtRoutes = require('./routes/courts');
const reservationRoutes = require('./routes/reservations');
const quedadaRoutes = require('./routes/quedadas');
const rankingRoutes = require('./routes/ranking');
const tournamentRoutes = require('./routes/tournaments');
const adminRoutes = require('./routes/admin');
const matchRoutes = require('./routes/matches');
const cashRoutes = require('./routes/cash');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const seasonRoutes = require('./routes/seasons');

const { errorHandler } = require('./middleware/errorHandler');
const checkTrial = require('./middleware/checkTrial');

const app = express();

// Aplicar middleware de control de periodo de prueba
app.use('/api', checkTrial);

// Seguridad y parsers
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #10b981; }',
  customSiteTitle: 'PADEL Club API',
}));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/quedadas', quedadaRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/seasons', seasonRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler global
app.use(errorHandler);

module.exports = app;
