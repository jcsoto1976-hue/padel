const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/create-session', authenticate, ctrl.createCheckoutSession);
router.post('/webhook', ctrl.stripeWebhook);

module.exports = router;
