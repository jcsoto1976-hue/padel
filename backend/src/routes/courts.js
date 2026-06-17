const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Courts
 *   description: Gestión de pistas
 */

router.get('/', ctrl.getCourts);
router.get('/:id', ctrl.getCourt);
router.post('/', authenticate, requireAdmin, ctrl.createCourt);
router.put('/:id', authenticate, requireAdmin, ctrl.updateCourt);

module.exports = router;
