const router = require('express').Router();
const ctrl = require('../controllers/rankingController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Ranking
 *   description: Clasificación ELO y estadísticas
 */

router.get('/', authenticate, ctrl.getRanking);
router.get('/algorithm-examples', ctrl.getAlgorithmExamples);
router.get('/players/:id/stats', authenticate, ctrl.getPlayerStats);
router.get('/h2h/:p1/:p2', authenticate, ctrl.getH2HStats);

module.exports = router;
