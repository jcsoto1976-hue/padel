const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/key', ctrl.getVapidPublicKey);
router.post('/subscribe', authenticate, ctrl.subscribe);

module.exports = router;
