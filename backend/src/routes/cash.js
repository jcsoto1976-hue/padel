const router = require('express').Router();
const ctrl = require('../controllers/cashController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Cash
 *   description: Control de caja diario, TPV e Inventarios
 */

router.use(authenticate, requireAdmin);

// Catálogo de productos y reabastecimiento
router.get('/products', ctrl.getProducts);
router.post('/products', ctrl.createProduct);
router.post('/products/:id/restock', ctrl.restockProduct);

// Movimientos de caja y TPV
router.get('/transactions', ctrl.getTransactions);
router.post('/transactions', ctrl.createTransaction);

// Cobro de reservas de canchas
router.post('/reservations/:id/close', ctrl.closeReservationPayment);

// Sumario diario e ingresos segregados
router.get('/summary', ctrl.getDailySummary);
router.post('/close', ctrl.closeCashRegister);

module.exports = router;
