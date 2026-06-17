const router = require('express').Router();
const ctrl = require('../controllers/seasonController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getSeasons);
router.post('/', authenticate, requireAdmin, ctrl.createSeason);
router.put('/:id/activate', authenticate, requireAdmin, ctrl.activateSeason);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteSeason);

module.exports = router;
