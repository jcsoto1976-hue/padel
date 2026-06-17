const router = require('express').Router();
const ctrl = require('../controllers/reservationController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservas de pistas
 */

router.get('/', authenticate, requireAdmin, ctrl.getAvailability);
router.get('/my', authenticate, requireAdmin, ctrl.getMyReservations);
router.get('/open', authenticate, ctrl.getOpenReservations);
router.post('/', authenticate, requireAdmin, ctrl.createReservation);
router.post('/:id/join', authenticate, ctrl.joinOpenReservation);
router.delete('/:id/leave', authenticate, ctrl.leaveOpenReservation);
router.delete('/:id', authenticate, requireAdmin, ctrl.cancelReservation);

module.exports = router;
