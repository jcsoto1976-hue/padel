const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Panel de administración
 */

router.get('/users', authenticate, requireAdmin, ctrl.getUsers);
router.post('/users', authenticate, requireAdmin, ctrl.createUser);
router.put('/users/:id/role', authenticate, requireAdmin, ctrl.updateUserRole);
router.get('/schedules/:courtId', authenticate, requireAdmin, ctrl.getSchedules);
router.put('/schedules/:courtId', authenticate, requireAdmin, ctrl.updateSchedules);

module.exports = router;
