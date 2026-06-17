const router = require('express').Router();
const ctrl = require('../controllers/matchController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Matches
 *   description: Partidos individuales y resultados
 */

router.get('/:id', authenticate, ctrl.getMatch);
router.post('/:id/result', authenticate, ctrl.reportResult);
router.post('/:id/confirm', authenticate, ctrl.confirmResult);
router.post('/:id/result-direct', authenticate, requireAdmin, ctrl.setResultDirect);

module.exports = router;
