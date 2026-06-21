const router = require('express').Router();
const ctrl = require('../controllers/tournamentController');
const { authenticate, requireAdmin, requireAdminOrCoach } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Tournaments
 *   description: Campeonatos y torneos
 */

router.get('/', authenticate, ctrl.getTournaments);
router.post('/', authenticate, requireAdmin, ctrl.createTournament);
router.put('/:id/status', authenticate, requireAdmin, ctrl.updateTournamentStatus);
router.get('/:id', authenticate, ctrl.getTournament);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteTournament);
router.post('/:id/pairs', authenticate, requireAdminOrCoach, ctrl.registerPair);
router.post('/:id/generate', authenticate, requireAdmin, ctrl.generateBracket);
router.put('/:id/matches/:matchId/result', authenticate, requireAdmin, ctrl.setMatchResult);

// Timer endpoints
router.post('/:id/timer/start', authenticate, requireAdmin, ctrl.startRoundTimer);
router.post('/:id/timer/pause', authenticate, requireAdmin, ctrl.pauseRoundTimer);
router.post('/:id/timer/resume', authenticate, requireAdmin, ctrl.resumeRoundTimer);
router.post('/:id/timer/stop', authenticate, requireAdmin, ctrl.stopRoundTimer);
router.put('/:id/timer/duration', authenticate, requireAdmin, ctrl.setRoundTimerDuration);

module.exports = router;
