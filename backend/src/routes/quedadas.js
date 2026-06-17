const router = require('express').Router();
const ctrl = require('../controllers/quedadaController');
const { authenticate, requireAdminOrCoach } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Quedadas
 *   description: Gestión de quedadas y emparejamientos
 */

router.get('/', authenticate, ctrl.getQuedadas);
router.post('/', authenticate, requireAdminOrCoach, ctrl.createQuedada);
router.get('/:id', authenticate, ctrl.getQuedada);
router.delete('/:id', authenticate, requireAdminOrCoach, ctrl.deleteQuedada);
router.post('/:id/join', authenticate, requireAdminOrCoach, ctrl.joinQuedada);
router.delete('/:id/leave', authenticate, requireAdminOrCoach, ctrl.leaveQuedada);
router.post('/:id/generate', authenticate, requireAdminOrCoach, ctrl.generateMatches);
router.put('/:id/matches/:matchId', authenticate, requireAdminOrCoach, ctrl.reassignMatch);
router.post('/:id/participants', authenticate, requireAdminOrCoach, ctrl.addParticipant);
router.delete('/:id/participants/:userId', authenticate, requireAdminOrCoach, ctrl.removeParticipant);

module.exports = router;
